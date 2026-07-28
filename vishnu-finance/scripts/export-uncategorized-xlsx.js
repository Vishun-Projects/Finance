/**
 * Export unique uncategorized transactions for manual category assignment.
 * Sheet 1 Uncategorized: Name | Raw data | Income or Expense | To be categorized in
 * Sheet 2 Categories: all income/expense categories
 *
 * Usage: node scripts/export-uncategorized-xlsx.js
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
const outXlsx = path.join(__dirname, '..', 'data', 'vishnu-uncategorized-to-categorize.xlsx');
const outCsv = path.join(__dirname, '..', 'data', 'vishnu-uncategorized-to-categorize.csv');
const catCsv = path.join(__dirname, '..', 'data', 'vishnu-categories-list.csv');

function rawText(t) {
  if (!t.rawData) return t.description || '';
  if (typeof t.rawData === 'string') return t.rawData;
  if (t.rawData.raw) return String(t.rawData.raw);
  return JSON.stringify(t.rawData);
}

function displayName(t) {
  return (t.personName || t.store || t.upiId || '').trim() || '(unknown)';
}

function escCsv(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

async function main() {
  const rows = await prisma.transaction.findMany({
    where: { userId: USER, isDeleted: false, categoryId: null },
    orderBy: [{ transactionDate: 'asc' }],
    select: {
      id: true,
      transactionDate: true,
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
  console.log('uncategorized txns', rows.length);

  const map = new Map();
  for (const t of rows) {
    const name = displayName(t);
    const raw = rawText(t).replace(/\s+/g, ' ').trim();
    const side = Number(t.creditAmount) > 0 ? 'INCOME' : 'EXPENSE';
    const key = [name.toLowerCase(), raw.toLowerCase().slice(0, 200), side].join('||');
    if (!map.has(key)) {
      map.set(key, {
        name,
        raw,
        side,
        firstDate: t.transactionDate,
        lastDate: t.transactionDate,
        count: 0,
        totalCredit: 0,
        totalDebit: 0,
        personName: t.personName || '',
        store: t.store || '',
        upiId: t.upiId || '',
      });
    }
    const u = map.get(key);
    u.count += 1;
    u.totalCredit += Number(t.creditAmount || 0);
    u.totalDebit += Number(t.debitAmount || 0);
    if (t.transactionDate < u.firstDate) u.firstDate = t.transactionDate;
    if (t.transactionDate > u.lastDate) u.lastDate = t.transactionDate;
  }

  const unique = [...map.values()].sort(
    (a, b) => a.firstDate - b.firstDate || a.name.localeCompare(b.name),
  );
  console.log('unique rows', unique.length);

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: USER }, { isDefault: true }] },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, type: true, isDefault: true },
  });
  console.log('categories', categories.length);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'vishnu-finance';
  wb.created = new Date();

  // Sheet 1 — Uncategorized (fill category here)
  const s1 = wb.addWorksheet('Uncategorized');
  s1.columns = [
    { header: 'Name', key: 'name', width: 36 },
    { header: 'Raw data', key: 'raw', width: 90 },
    { header: 'Income or Expense', key: 'side', width: 18 },
    { header: 'To be categorized in', key: 'category', width: 28 },
    { header: 'First date', key: 'firstDate', width: 12 },
    { header: 'Last date', key: 'lastDate', width: 12 },
    { header: 'Count', key: 'count', width: 8 },
    { header: 'Total amount', key: 'amount', width: 14 },
    { header: 'Person', key: 'person', width: 28 },
    { header: 'Store', key: 'store', width: 28 },
    { header: 'UPI', key: 'upi', width: 32 },
  ];
  s1.getRow(1).font = { bold: true };
  s1.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };

  // Sheet 2 — Categories (created before dropdowns so reference works)
  const s2 = wb.addWorksheet('Categories');
  s2.columns = [
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Category ID', key: 'id', width: 30 },
    { header: 'Category name', key: 'name', width: 36 },
    { header: 'Default?', key: 'isDefault', width: 10 },
  ];
  s2.getRow(1).font = { bold: true };
  s2.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };
  for (const c of categories) {
    s2.addRow({
      type: c.type,
      id: c.id,
      name: c.name,
      isDefault: c.isDefault ? 'yes' : 'no',
    });
  }

  const catLastRow = categories.length + 1;
  for (const u of unique) {
    const row = s1.addRow({
      name: u.name,
      raw: u.raw,
      side: u.side,
      category: '',
      firstDate: u.firstDate.toISOString().slice(0, 10),
      lastDate: u.lastDate.toISOString().slice(0, 10),
      count: u.count,
      amount:
        u.side === 'INCOME'
          ? Math.round(u.totalCredit * 100) / 100
          : Math.round(u.totalDebit * 100) / 100,
      person: u.personName,
      store: u.store,
      upi: u.upiId,
    });
    row.getCell(4).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`Categories!$C$2:$C$${catLastRow}`],
      showErrorMessage: true,
      errorTitle: 'Invalid category',
      error: 'Pick a category from the Categories sheet',
    };
  }

  const s3 = wb.addWorksheet('Instructions');
  s3.getColumn(1).width = 110;
  s3.addRow([
    'Sheet Uncategorized: fill column D (To be categorized in). Use the dropdown or copy exact names from Categories column C.',
  ]);
  s3.addRow(['Required columns: Name | Raw data | Income or Expense | To be categorized in']);
  s3.addRow([
    `Unique groups: ${unique.length}  |  Total uncategorized txns: ${rows.length}`,
  ]);
  s3.addRow(['When done, send this xlsx back and I will apply the categories.']);

  await wb.xlsx.writeFile(outXlsx);
  console.log('Wrote', outXlsx);

  const csvLines = [
    [
      'Name',
      'Raw data',
      'Income or Expense',
      'To be categorized in',
      'First date',
      'Last date',
      'Count',
      'Total amount',
      'Person',
      'Store',
      'UPI',
    ]
      .map(escCsv)
      .join(','),
  ];
  for (const u of unique) {
    csvLines.push(
      [
        u.name,
        u.raw,
        u.side,
        '',
        u.firstDate.toISOString().slice(0, 10),
        u.lastDate.toISOString().slice(0, 10),
        u.count,
        u.side === 'INCOME'
          ? Math.round(u.totalCredit * 100) / 100
          : Math.round(u.totalDebit * 100) / 100,
        u.personName,
        u.store,
        u.upiId,
      ]
        .map(escCsv)
        .join(','),
    );
  }
  fs.writeFileSync(outCsv, csvLines.join('\n'), 'utf8');
  fs.writeFileSync(
    catCsv,
    ['Type,Category name,Category ID,Default']
      .concat(
        categories.map((c) =>
          [c.type, c.name, c.id, c.isDefault ? 'yes' : 'no'].map(escCsv).join(','),
        ),
      )
      .join('\n'),
    'utf8',
  );
  console.log('Wrote', outCsv);
  console.log('Wrote', catCsv);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
