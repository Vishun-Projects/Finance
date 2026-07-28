/**
 * Apply categories from data/vishnu-uncategorized-to-categorize.xlsx
 * Fixes income/expense vs category-type mismatches, then updates DB.
 *
 * Usage: node scripts/apply-uncategorized-xlsx.js
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

for (const envFile of ['.env.local', '.env']) {
  const p = path.join(__dirname, '..', envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(k in process.env)) process.env[k] = v;
  }
}

const prisma = new PrismaClient();
const USER = 'cmhtbqk6t0000ju04hxwu08x2';
const XLSX = path.join(__dirname, '..', 'data', 'vishnu-uncategorized-to-categorize.xlsx');

function cellStr(cell) {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object' && v.text) return String(v.text).trim();
  if (typeof v === 'object' && v.result != null) return String(v.result).trim();
  return String(v).trim();
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function rawText(t) {
  if (!t.rawData) return t.description || '';
  if (typeof t.rawData === 'string') return t.rawData;
  if (t.rawData.raw) return String(t.rawData.raw);
  return JSON.stringify(t.rawData);
}

function displayName(t) {
  return (t.personName || t.store || t.upiId || '').trim() || '(unknown)';
}

async function main() {
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: USER }, { isDefault: true }] },
    select: { id: true, name: true, type: true },
  });
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const byId = new Map(categories.map((c) => [c.id, c]));

  const otherIncome = byName.get('other income');
  const otherExpenses = byName.get('other expenses');
  const transferIncome = byName.get('transfer');

  // Bidirectional people categories (EXPENSE type in schema, used both ways historically)
  const bidirectional = new Set([
    'friend',
    'friends & social',
    'family',
    'family support',
  ]);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const sheet = wb.getWorksheet('Uncategorized');
  if (!sheet) throw new Error('Uncategorized sheet missing');

  const corrections = [];
  const mappings = []; // { name, raw, side, categoryId, categoryName, correctedFrom? }

  sheet.eachRow((row, i) => {
    if (i === 1) return;
    const name = cellStr(row.getCell(1));
    const raw = cellStr(row.getCell(2));
    const side = cellStr(row.getCell(3)).toUpperCase();
    let chosen = cellStr(row.getCell(4));
    if (!chosen) return;

    let meta = byName.get(chosen.toLowerCase());
    if (!meta) {
      corrections.push({ row: i, name, issue: `unknown category "${chosen}"`, action: 'skip' });
      return;
    }

    let correctedFrom = null;
    const isBi = bidirectional.has(meta.name.toLowerCase());

    if (side === 'INCOME' && meta.type !== 'INCOME' && !isBi) {
      // INCOME + Miscellaneous → Other Income
      if (/misc/i.test(meta.name) && otherIncome) {
        correctedFrom = meta.name;
        meta = otherIncome;
        chosen = meta.name;
      } else if (transferIncome) {
        correctedFrom = meta.name;
        meta = transferIncome;
        chosen = meta.name;
      }
    }

    if (side === 'EXPENSE' && meta.type !== 'EXPENSE' && !isBi) {
      // EXPENSE + Gifts & Donations (INCOME type) → Other Expenses
      if (/gift/i.test(meta.name) && otherExpenses) {
        correctedFrom = meta.name;
        meta = otherExpenses;
        chosen = meta.name;
      } else if (otherExpenses) {
        correctedFrom = meta.name;
        meta = otherExpenses;
        chosen = meta.name;
      }
    }

    if (correctedFrom) {
      corrections.push({
        row: i,
        name,
        side,
        from: correctedFrom,
        to: chosen,
      });
      row.getCell(4).value = chosen;
    }

    mappings.push({
      name,
      raw,
      side,
      categoryId: meta.id,
      categoryName: meta.name,
      key: [norm(name), norm(raw).slice(0, 200), side].join('||'),
    });
  });

  console.log('sheet mappings', mappings.length);
  console.log('corrections', corrections.length);
  corrections.forEach((c) => console.log(' ', c));

  // Load uncategorized txns and match
  const txns = await prisma.transaction.findMany({
    where: { userId: USER, isDeleted: false, categoryId: null },
    select: {
      id: true,
      description: true,
      rawData: true,
      personName: true,
      store: true,
      upiId: true,
      creditAmount: true,
      debitAmount: true,
      financialCategory: true,
    },
  });
  console.log('uncategorized in DB', txns.length);

  const mapByKey = new Map();
  for (const m of mappings) {
    if (!mapByKey.has(m.key)) mapByKey.set(m.key, m);
  }

  let matched = 0;
  let unmatched = 0;
  const updates = [];

  for (const t of txns) {
    const name = displayName(t);
    const raw = rawText(t).replace(/\s+/g, ' ').trim();
    const side = Number(t.creditAmount) > 0 ? 'INCOME' : 'EXPENSE';
    const key = [norm(name), norm(raw).slice(0, 200), side].join('||');
    let m = mapByKey.get(key);

    // Fallback: name + side only if unique in mappings
    if (!m) {
      const nameSide = mappings.filter(
        (x) => norm(x.name) === norm(name) && x.side === side,
      );
      if (nameSide.length === 1) m = nameSide[0];
      else if (nameSide.length > 1) {
        // try looser raw match
        const loose = nameSide.find(
          (x) =>
            norm(x.raw).includes(norm(raw).slice(0, 40)) ||
            norm(raw).includes(norm(x.raw).slice(0, 40)),
        );
        if (loose) m = loose;
      }
    }

    if (!m) {
      unmatched += 1;
      continue;
    }

    matched += 1;
    updates.push({
      id: t.id,
      categoryId: m.categoryId,
      financialCategory: m.side,
    });
  }

  console.log({ matched, unmatched, toUpdate: updates.length });

  // Group by category+side and updateMany (avoids pool exhaustion)
  const groups = new Map();
  for (const u of updates) {
    const gk = `${u.categoryId}||${u.financialCategory}`;
    if (!groups.has(gk)) {
      groups.set(gk, {
        categoryId: u.categoryId,
        financialCategory: u.financialCategory,
        ids: [],
      });
    }
    groups.get(gk).ids.push(u.id);
  }

  let updated = 0;
  for (const g of groups.values()) {
    // chunk ids to keep IN lists reasonable
    const ID_BATCH = 200;
    for (let i = 0; i < g.ids.length; i += ID_BATCH) {
      const ids = g.ids.slice(i, i + ID_BATCH);
      const res = await prisma.transaction.updateMany({
        where: { id: { in: ids }, userId: USER },
        data: {
          categoryId: g.categoryId,
          financialCategory: g.financialCategory,
          autoCategorized: false,
        },
      });
      updated += res.count;
    }
  }
  console.log('updated', updated, 'across', groups.size, 'category groups');

  // Save corrected xlsx
  const outCorrected = path.join(
    __dirname,
    '..',
    'data',
    'vishnu-uncategorized-to-categorize-applied.xlsx',
  );
  await wb.xlsx.writeFile(outCorrected);
  console.log('wrote corrected copy', outCorrected);

  // Verify
  const left = await prisma.transaction.count({
    where: { userId: USER, isDeleted: false, categoryId: null },
  });
  const [incomeRes, expenseRes] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: USER, isDeleted: false, financialCategory: 'INCOME' },
      _sum: { creditAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: USER, isDeleted: false, financialCategory: 'EXPENSE' },
      _sum: { debitAmount: true },
    }),
  ]);
  const income = Number(incomeRes._sum.creditAmount || 0);
  const spent = Number(expenseRes._sum.debitAmount || 0);
  console.log({
    stillUncategorized: left,
    uiIncome: Math.round(income),
    uiSpent: Math.round(spent),
    uiNet: Math.round(income - spent),
  });

  // Top categories after apply among previously-null (spot check via recent updates - skip)
  const top = await prisma.$queryRawUnsafe(
    `
    SELECT c.name, t."financialCategory"::text as fc, COUNT(*)::int as n,
      ROUND(SUM(t."debitAmount")::numeric,2) as debits,
      ROUND(SUM(t."creditAmount")::numeric,2) as credits
    FROM transactions t
    JOIN categories c ON c.id = t."categoryId"
    WHERE t."userId" = $1 AND COALESCE(t."isDeleted",false)=false
      AND t."autoCategorized" = false
      AND t."updatedAt" > NOW() - INTERVAL '10 minutes'
    GROUP BY 1,2
    ORDER BY n DESC
    LIMIT 20
  `,
    USER,
  );
  console.log('recently applied category mix', top);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
