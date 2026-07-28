/**
 * Wipe + reimport bank statements for vishun.orv@gmail.com.
 *
 * 1. Snapshot store/person/upi → category from live + soft-deleted txns
 * 2. Hard-delete settlements, transactions, account_statements
 * 3. Parse + import the two Indian Bank PDFs
 * 4. Remap categories from snapshot
 * 5. Verify
 *
 * Usage:
 *   PYTHON_PARSER_URL=http://127.0.0.1:8001/api/parser node scripts/wipe-and-reimport-vishnu.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// Load .env.local then .env
for (const envFile of ['.env.local', '.env']) {
  const p = path.join(__dirname, '..', envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(k in process.env)) process.env[k] = v;
  }
}

const USER_ID = 'cmhtbqk6t0000ju04hxwu08x2';
const USER_EMAIL = 'vishun.orv@gmail.com';
const SNAPSHOT_PATH = path.join(__dirname, '..', 'data', 'vishnu-orv-category-snapshot.json');
const PDFS = [
  path.join(__dirname, '..', 'data', 'AccountStatement_28-10-2025 11_00_46.pdf'),
  path.join(__dirname, '..', 'data', 'AccountStatement_27-07-2026 12_45_44.pdf'),
];

const PARSER_URL =
  (process.env.PYTHON_PARSER_URL || 'http://127.0.0.1:8001/api/parser').replace(/\/$/, '');

const prisma = new PrismaClient();

function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractStableReference(description) {
  if (!description) return null;
  const patterns = [
    /\/UPI\/(\d{10,})\//i,
    /UPI:(\d{10,}):/i,
    /UPI[:\/\s-]+(\d{10,})/i,
    /NEFT[\/\s-]+([A-Z0-9]{8,24})/i,
    /IMPS[\/\s-]+([A-Z0-9]{8,24})/i,
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  const longNums = description.match(/\b(\d{12,})\b/g);
  if (longNums?.length) return longNums[longNums.length - 1];
  return null;
}

function generateDedupHash(userId, tx) {
  if (tx.transactionId && String(tx.transactionId).trim().length > 5) {
    return `id_${userId}_${String(tx.transactionId).trim()}`;
  }
  const dateStr = toLocalISODate(tx.transactionDate);
  const credit = Number(tx.creditAmount || 0).toFixed(2);
  const debit = Number(tx.debitAmount || 0).toFixed(2);
  const stableRef = extractStableReference(tx.description || '');
  const balancePart =
    tx.balance != null && !Number.isNaN(Number(tx.balance))
      ? `|bal_${Number(tx.balance).toFixed(2)}`
      : '';
  const fingerprint = stableRef
    ? `${userId}|${dateStr}|${credit}|${debit}|${stableRef}${balancePart}`
    : `${userId}|${dateStr}|${credit}|${debit}${balancePart}|${String(tx.description || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
        .substring(0, 100)}`;
  return crypto.createHash('md5').update(fingerprint).digest('hex');
}

function cuidLike() {
  return (
    'c' +
    Date.now().toString(36) +
    crypto.randomBytes(8).toString('hex')
  );
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.includes('T') ? s : `${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // DD Mon YYYY
  const m1 = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (m1) {
    const d = new Date(`${m1[2]} ${m1[1]}, ${m1[3]} 12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m2) {
    let y = Number(m2[3]);
    if (y < 100) y += 2000;
    const d = new Date(y, Number(m2[2]) - 1, Number(m2[1]), 12);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickBestMapping(rows) {
  // rows: { categoryId, subcategoryId, financialCategory, autoCategorized, isDeleted, count, categoryName }
  // Prefer manual, then live, then highest count
  const scored = rows.map((r) => ({
    ...r,
    score:
      (r.autoCategorized === false ? 1_000_000 : 0) +
      (r.isDeleted ? 0 : 100_000) +
      r.count,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

async function buildSnapshot() {
  console.log('\n=== 1. SNAPSHOT category mappings ===');
  const txns = await prisma.transaction.findMany({
    where: {
      userId: USER_ID,
      categoryId: { not: null },
      OR: [
        { store: { not: null } },
        { personName: { not: null } },
        { upiId: { not: null } },
      ],
    },
    select: {
      store: true,
      personName: true,
      upiId: true,
      categoryId: true,
      subcategoryId: true,
      financialCategory: true,
      autoCategorized: true,
      isDeleted: true,
      category: { select: { name: true } },
    },
  });

  const buckets = {
    store: new Map(),
    person: new Map(),
    upi: new Map(),
  };

  function add(kind, rawKey, row) {
    const key = normKey(rawKey);
    if (!key) return;
    const map = buckets[kind];
    if (!map.has(key)) map.set(key, []);
    const list = map.get(key);
    const existing = list.find(
      (x) =>
        x.categoryId === row.categoryId &&
        x.subcategoryId === row.subcategoryId &&
        x.autoCategorized === row.autoCategorized &&
        x.isDeleted === row.isDeleted,
    );
    if (existing) {
      existing.count += 1;
    } else {
      list.push({
        categoryId: row.categoryId,
        subcategoryId: row.subcategoryId,
        financialCategory: row.financialCategory,
        autoCategorized: row.autoCategorized !== false, // null → true
        isDeleted: !!row.isDeleted,
        categoryName: row.category?.name || null,
        count: 1,
      });
    }
  }

  for (const t of txns) {
    if (t.store) add('store', t.store, t);
    if (t.personName) add('person', t.personName, t);
    if (t.upiId) add('upi', t.upiId, t);
  }

  const snapshot = {
    userId: USER_ID,
    email: USER_EMAIL,
    createdAt: new Date().toISOString(),
    stores: {},
    persons: {},
    upis: {},
  };

  for (const [key, rows] of buckets.store) {
    const best = pickBestMapping(rows);
    snapshot.stores[key] = {
      categoryId: best.categoryId,
      subcategoryId: best.subcategoryId,
      financialCategory: best.financialCategory,
      categoryName: best.categoryName,
      manual: best.autoCategorized === false,
      sourceCount: best.count,
    };
  }
  for (const [key, rows] of buckets.person) {
    const best = pickBestMapping(rows);
    snapshot.persons[key] = {
      categoryId: best.categoryId,
      subcategoryId: best.subcategoryId,
      financialCategory: best.financialCategory,
      categoryName: best.categoryName,
      manual: best.autoCategorized === false,
      sourceCount: best.count,
    };
  }
  for (const [key, rows] of buckets.upi) {
    const best = pickBestMapping(rows);
    snapshot.upis[key] = {
      categoryId: best.categoryId,
      subcategoryId: best.subcategoryId,
      financialCategory: best.financialCategory,
      categoryName: best.categoryName,
      manual: best.autoCategorized === false,
      sourceCount: best.count,
    };
  }

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(
    `Wrote ${SNAPSHOT_PATH}\n` +
      `  stores=${Object.keys(snapshot.stores).length} ` +
      `persons=${Object.keys(snapshot.persons).length} ` +
      `upis=${Object.keys(snapshot.upis).length} ` +
      `(from ${txns.length} categorized txn rows)`,
  );
  return snapshot;
}

async function wipe() {
  console.log('\n=== 2. WIPE settlements / transactions / account_statements ===');
  const before = {
    txns: await prisma.transaction.count({ where: { userId: USER_ID } }),
    statements: await prisma.accountStatement.count({ where: { userId: USER_ID } }),
    settlements: await prisma.transactionSettlement.count({ where: { userId: USER_ID } }),
  };
  console.log('Before:', before);

  // Delete settlement members via settlements for this user
  const settlements = await prisma.transactionSettlement.findMany({
    where: { userId: USER_ID },
    select: { id: true },
  });
  if (settlements.length) {
    await prisma.transactionSettlementMember.deleteMany({
      where: { settlementId: { in: settlements.map((s) => s.id) } },
    });
    await prisma.transactionSettlement.deleteMany({ where: { userId: USER_ID } });
  }

  const delTx = await prisma.transaction.deleteMany({ where: { userId: USER_ID } });
  const delSt = await prisma.accountStatement.deleteMany({ where: { userId: USER_ID } });

  const after = {
    txns: await prisma.transaction.count({ where: { userId: USER_ID } }),
    statements: await prisma.accountStatement.count({ where: { userId: USER_ID } }),
    settlements: await prisma.transactionSettlement.count({ where: { userId: USER_ID } }),
  };
  console.log(`Deleted transactions=${delTx.count}, statements=${delSt.count}`);
  console.log('After:', after);
  if (after.txns !== 0 || after.statements !== 0 || after.settlements !== 0) {
    throw new Error('Wipe incomplete');
  }
}

async function waitForParser(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const base = PARSER_URL.replace(/\/api\/parser$/, '');
      const res = await fetch(base + '/');
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.status === 'ok' || j.message) {
          console.log(`Parser ready at ${PARSER_URL}`);
          return;
        }
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Python parser not reachable at ${PARSER_URL}`);
}

async function parsePdf(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const pdf_data = buf.toString('base64');
  console.log(`Parsing ${path.basename(pdfPath)} (${buf.length} bytes)...`);

  let bankProfiles = [];
  try {
    bankProfiles = await prisma.bankParserConfig.findMany({
      where: { isActive: true },
      select: {
        bankCode: true,
        bankName: true,
        detectionKeywords: true,
        headerKeywords: true,
        columns: true,
        parserType: true,
      },
    });
  } catch (e) {
    console.warn('Could not load bank configs:', e.message);
  }

  const res = await fetch(PARSER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'pdf',
      payload: {
        pdf_data,
        bank: 'idib',
        bank_profiles: bankProfiles,
        password: '',
      },
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Parser non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`Parser HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  }

  // Unwrap vercel-style envelope if present
  if (data.statusCode && data.body) {
    const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
    if (data.statusCode !== 200) {
      throw new Error(`Parser failed: ${body.error || JSON.stringify(body)}`);
    }
    data = body;
  }

  const transactions = data.transactions || [];
  const metadata = data.metadata || {};
  console.log(
    `  parsed=${transactions.length} method=${data.parserMethod || metadata.parserMethod || 'n/a'} ` +
      `acct=${metadata.accountNumber || 'n/a'} ` +
      `period=${metadata.statementStartDate || '?'} → ${metadata.statementEndDate || '?'}`,
  );
  return { transactions, metadata, parserMethod: data.parserMethod || metadata.parserMethod };
}

function lookupSnapshot(snapshot, record) {
  const upi = normKey(record.upiId);
  const store = normKey(record.store);
  const person = normKey(record.personName);
  if (upi && snapshot.upis[upi]) return { ...snapshot.upis[upi], match: 'upi' };
  if (store && snapshot.stores[store]) return { ...snapshot.stores[store], match: 'store' };
  if (person && snapshot.persons[person]) return { ...snapshot.persons[person], match: 'person' };
  return null;
}

function normalizeRecord(r, userId) {
  const creditAmount = Number(r.credit ?? r.creditAmount ?? 0) || 0;
  const debitAmount = Number(r.debit ?? r.debitAmount ?? 0) || 0;
  const hasZeroAmount = creditAmount === 0 && debitAmount === 0;

  let parsedDate = parseDate(r.date_iso || r.date || r.transactionDate);
  const hasInvalidDate = !parsedDate;
  if (!parsedDate) return null;

  let financialCategory = 'EXPENSE';
  if (creditAmount > 0 && debitAmount === 0) financialCategory = 'INCOME';
  else if (debitAmount > 0) financialCategory = 'EXPENSE';

  const descriptionUpper = String(r.title || r.description || '').toUpperCase();
  const isNEFT =
    descriptionUpper.includes('NEFT') ||
    descriptionUpper.includes('RTGS') ||
    descriptionUpper.includes('IMPS');
  if (creditAmount > 0 && isNEFT) financialCategory = 'INCOME';

  let description = String(r.title || r.description || '').trim();
  if (!description) description = String(r.raw || r.rawData || '').trim() || 'Uncategorized Transaction';

  const balance = r.balance != null && r.balance !== '' ? Number(r.balance) : null;

  return {
    description,
    transactionDate: parsedDate,
    creditAmount,
    debitAmount,
    financialCategory,
    notes: (r.notes || r.commodity || '').toString().trim() || null,
    bankCode: r.bankCode || null,
    transactionId: r.transactionId || null,
    accountNumber: r.accountNumber || null,
    transferType: r.transferType || null,
    personName: r.personName || null,
    upiId: r.upiId || null,
    branch: r.branch || null,
    store: r.store || null,
    balance: Number.isFinite(balance) ? balance : null,
    rawData: r.raw || r.rawData || null,
    isPartialData: !description || hasZeroAmount || hasInvalidDate,
    hasInvalidDate,
    hasZeroAmount,
    parsingMethod: r.parsingMethod || 'standard',
    parsingConfidence: r.parsingConfidence || (hasZeroAmount ? 0.5 : 1.0),
    dedupHash: generateDedupHash(userId, {
      transactionDate: parsedDate,
      description,
      creditAmount,
      debitAmount,
      transactionId: r.transactionId || null,
      balance: Number.isFinite(balance) ? balance : null,
    }),
  };
}

async function getOrCreateStatement(userId, accountNumber, bankCode, metadata, records) {
  const dates = records.map((r) => r.transactionDate).filter(Boolean);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const totalDebits = records.reduce((s, r) => s + (r.debitAmount || 0), 0);
  const totalCredits = records.reduce((s, r) => s + (r.creditAmount || 0), 0);

  const startDate = metadata.statementStartDate
    ? parseDate(metadata.statementStartDate) || minDate
    : minDate;
  const endDate = metadata.statementEndDate
    ? parseDate(metadata.statementEndDate) || maxDate
    : maxDate;

  let openingBalance = metadata.openingBalance != null ? Number(metadata.openingBalance) : null;
  let closingBalance = metadata.closingBalance != null ? Number(metadata.closingBalance) : null;
  if (closingBalance == null && records.length) {
    const withBal = records.filter((r) => r.balance != null);
    if (withBal.length) closingBalance = withBal[withBal.length - 1].balance;
  }
  if (openingBalance == null) openingBalance = 0;
  if (closingBalance == null) closingBalance = openingBalance + totalCredits - totalDebits;

  const existing = await prisma.accountStatement.findFirst({
    where: { userId, accountNumber, bankCode, statementStartDate: startDate },
  });

  let statement;
  if (existing) {
    statement = await prisma.accountStatement.update({
      where: { id: existing.id },
      data: {
        statementEndDate: endDate,
        openingBalance,
        closingBalance,
        totalDebits,
        totalCredits,
        transactionCount: records.length,
        importedAt: new Date(),
        importedBy: userId,
        isActive: true,
        metadata: JSON.stringify({
          ifsc: metadata.ifsc || null,
          branch: metadata.branch || null,
          accountHolderName: metadata.accountHolderName || null,
        }),
      },
    });
  } else {
    statement = await prisma.accountStatement.create({
      data: {
        userId,
        accountNumber,
        bankCode,
        statementStartDate: startDate,
        statementEndDate: endDate,
        openingBalance,
        closingBalance,
        totalDebits,
        totalCredits,
        transactionCount: records.length,
        importedBy: userId,
        metadata: JSON.stringify({
          ifsc: metadata.ifsc || null,
          branch: metadata.branch || null,
          accountHolderName: metadata.accountHolderName || null,
        }),
        isActive: true,
      },
    });
  }

  await prisma.accountStatement.updateMany({
    where: { userId, accountNumber, bankCode, id: { not: statement.id } },
    data: { isActive: false },
  });

  return statement;
}

async function importParsed(snapshot, pdfPath, parsed) {
  console.log(`\nImporting ${path.basename(pdfPath)}...`);
  const normalized = [];
  const seen = new Set();
  for (const r of parsed.transactions) {
    const n = normalizeRecord(r, USER_ID);
    if (!n) continue;
    if (seen.has(n.dedupHash)) continue;
    seen.add(n.dedupHash);
    normalized.push(n);
  }
  console.log(`  normalized=${normalized.length} (from ${parsed.transactions.length})`);

  const accountNumber =
    parsed.metadata.accountNumber ||
    normalized.find((r) => r.accountNumber)?.accountNumber ||
    '50366568179';
  const bankCode =
    parsed.metadata.bankCode ||
    normalized.find((r) => r.bankCode)?.bankCode ||
    'IDIB';

  // Stamp account on rows missing it
  for (const r of normalized) {
    if (!r.accountNumber) r.accountNumber = accountNumber;
    if (!r.bankCode) r.bankCode = bankCode;
  }

  const statement = await getOrCreateStatement(
    USER_ID,
    accountNumber,
    bankCode,
    parsed.metadata,
    normalized,
  );
  console.log(
    `  statement id=${statement.id} ${toLocalISODate(statement.statementStartDate)} → ${toLocalISODate(statement.statementEndDate)}`,
  );

  // Check existing dedup hashes (for overlap day)
  const hashes = normalized.map((r) => r.dedupHash);
  const existing = await prisma.transaction.findMany({
    where: { userId: USER_ID, dedupHash: { in: hashes } },
    select: { dedupHash: true },
  });
  const existingSet = new Set(existing.map((e) => e.dedupHash));

  const now = new Date();
  const toInsert = [];
  let snapMatched = 0;
  let duplicates = 0;

  for (const r of normalized) {
    if (existingSet.has(r.dedupHash)) {
      duplicates += 1;
      continue;
    }
    const hit = lookupSnapshot(snapshot, r);
    let categoryId = null;
    let subcategoryId = null;
    let autoCategorized = true;
    let financialCategory = r.financialCategory;
    if (hit) {
      categoryId = hit.categoryId;
      subcategoryId = hit.subcategoryId || null;
      autoCategorized = !hit.manual;
      if (hit.financialCategory) financialCategory = hit.financialCategory;
      snapMatched += 1;
    }
    toInsert.push({
      id: cuidLike(),
      userId: USER_ID,
      transactionDate: r.transactionDate,
      description: r.description,
      creditAmount: r.creditAmount,
      debitAmount: r.debitAmount,
      financialCategory,
      categoryId,
      subcategoryId,
      bankCode: r.bankCode,
      transactionId: r.transactionId,
      accountNumber: r.accountNumber,
      transferType: r.transferType,
      personName: r.personName,
      upiId: r.upiId,
      branch: r.branch,
      store: r.store,
      rawData: r.rawData ? (typeof r.rawData === 'string' ? { raw: r.rawData } : r.rawData) : undefined,
      balance: r.balance,
      isPartialData: r.isPartialData,
      hasInvalidDate: r.hasInvalidDate,
      hasZeroAmount: r.hasZeroAmount,
      parsingMethod: r.parsingMethod || parsed.parserMethod || 'standard',
      parsingConfidence: r.parsingConfidence,
      notes: r.notes,
      isDeleted: false,
      dedupHash: r.dedupHash,
      autoCategorized,
      accountStatementId: statement.id,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Batch insert
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH);
    await prisma.transaction.createMany({ data: chunk, skipDuplicates: true });
    inserted += chunk.length;
  }

  console.log(
    `  inserted=${inserted} duplicates_skipped=${duplicates} snapshot_prematched=${snapMatched}`,
  );
  return { inserted, duplicates, snapMatched, total: normalized.length };
}

async function remapFromSnapshot(snapshot) {
  console.log('\n=== 4. REMAP from snapshot (fill gaps) ===');
  const txns = await prisma.transaction.findMany({
    where: { userId: USER_ID, isDeleted: false },
    select: {
      id: true,
      store: true,
      personName: true,
      upiId: true,
      categoryId: true,
      autoCategorized: true,
    },
  });

  let remapped = 0;
  let already = 0;
  let unmatched = 0;
  const updates = [];

  for (const t of txns) {
    const hit = lookupSnapshot(snapshot, t);
    if (!hit) {
      if (!t.categoryId) unmatched += 1;
      else already += 1;
      continue;
    }
    if (t.categoryId === hit.categoryId && (!hit.manual || t.autoCategorized === false)) {
      already += 1;
      continue;
    }
    updates.push({
      id: t.id,
      categoryId: hit.categoryId,
      subcategoryId: hit.subcategoryId || null,
      autoCategorized: !hit.manual,
      financialCategory: hit.financialCategory,
    });
  }

  // Update in small parallel batches
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((u) =>
        prisma.transaction.update({
          where: { id: u.id },
          data: {
            categoryId: u.categoryId,
            subcategoryId: u.subcategoryId,
            autoCategorized: u.autoCategorized,
            ...(u.financialCategory ? { financialCategory: u.financialCategory } : {}),
          },
        }),
      ),
    );
    remapped += chunk.length;
  }

  const stillNull = await prisma.transaction.count({
    where: { userId: USER_ID, isDeleted: false, categoryId: null },
  });
  const withCat = await prisma.transaction.count({
    where: { userId: USER_ID, isDeleted: false, categoryId: { not: null } },
  });

  console.log(
    `  remapped_now=${remapped} already_ok=${already} no_snapshot_match_uncategorized≈${unmatched}`,
  );
  console.log(`  final: categorized=${withCat} uncategorized=${stillNull}`);
  return { remapped, already, stillNull, withCat };
}

async function verify() {
  console.log('\n=== 5. VERIFY ===');
  const total = await prisma.transaction.count({ where: { userId: USER_ID } });
  const live = await prisma.transaction.count({ where: { userId: USER_ID, isDeleted: false } });
  const deleted = await prisma.transaction.count({ where: { userId: USER_ID, isDeleted: true } });
  const statements = await prisma.accountStatement.findMany({
    where: { userId: USER_ID },
    orderBy: { statementStartDate: 'asc' },
    select: {
      accountNumber: true,
      bankCode: true,
      statementStartDate: true,
      statementEndDate: true,
      transactionCount: true,
      isActive: true,
      openingBalance: true,
      closingBalance: true,
    },
  });
  const agg = await prisma.transaction.aggregate({
    where: { userId: USER_ID, isDeleted: false },
    _min: { transactionDate: true },
    _max: { transactionDate: true },
  });

  console.log(`txns total=${total} live=${live} softDeleted=${deleted}`);
  console.log(
    `date span: ${agg._min.transactionDate && toLocalISODate(agg._min.transactionDate)} → ${agg._max.transactionDate && toLocalISODate(agg._max.transactionDate)}`,
  );
  console.log('statements:');
  for (const s of statements) {
    console.log(
      `  ${s.accountNumber} ${s.bankCode} ${toLocalISODate(s.statementStartDate)} → ${toLocalISODate(s.statementEndDate)} ` +
        `count=${s.transactionCount} active=${s.isActive} open=${s.openingBalance} close=${s.closingBalance}`,
    );
  }

  // Sample merchants
  const samples = [
    { field: 'store', like: '%uber%', expectHint: 'Train Pass / Transport' },
    { field: 'store', like: '%spotify%', expectHint: 'OTT' },
    { field: 'store', like: '%surendra%', expectHint: 'Transportation' },
    { field: 'store', like: '%google%', expectHint: 'Utilities/Mobile' },
  ];
  for (const s of samples) {
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT lower(trim(t."${s.field}")) as key, c.name as cat, COUNT(*)::int as n
      FROM transactions t
      LEFT JOIN categories c ON c.id = t."categoryId"
      WHERE t."userId" = $1 AND COALESCE(t."isDeleted", false) = false
        AND t."${s.field}" ILIKE $2
      GROUP BY 1, 2
      ORDER BY n DESC
      LIMIT 5
      `,
      USER_ID,
      s.like,
    );
    console.log(`  sample ${s.field} ${s.like}:`, rows);
  }

  const ok =
    deleted === 0 &&
    live > 1000 &&
    agg._min.transactionDate &&
    agg._max.transactionDate &&
    toLocalISODate(agg._min.transactionDate) <= '2024-04-29' &&
    toLocalISODate(agg._max.transactionDate) >= '2026-07-20' &&
    statements.length >= 1;

  if (!ok) {
    console.warn('Verification warnings — check counts/dates above.');
  } else {
    console.log('Verification OK.');
  }
  return ok;
}

async function main() {
  console.log(`Target: ${USER_EMAIL} (${USER_ID})`);
  console.log(`Parser: ${PARSER_URL}`);

  for (const pdf of PDFS) {
    if (!fs.existsSync(pdf)) throw new Error(`Missing PDF: ${pdf}`);
  }

  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user || user.email !== USER_EMAIL) {
    throw new Error(`User mismatch: expected ${USER_EMAIL}, got ${user?.email}`);
  }

  const snapshot = await buildSnapshot();
  await wipe();

  await waitForParser();

  console.log('\n=== 3. PARSE + IMPORT PDFs ===');
  for (const pdf of PDFS) {
    const parsed = await parsePdf(pdf);
    if (!parsed.transactions.length) {
      throw new Error(`No transactions parsed from ${pdf}`);
    }
    await importParsed(snapshot, pdf, parsed);
  }

  await remapFromSnapshot(snapshot);
  await verify();
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error('\nFAILED:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
