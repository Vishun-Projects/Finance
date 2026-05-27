#!/usr/bin/env node
/**
 * Migrate legacy expense categories to plan-aligned categories.
 * Usage: node scripts/migrate-plan-expense-categories.js [--user=email] [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MOBILE_INTERNET_PATTERNS = [
  'jio', 'airtel', 'vi ', 'vodafone', 'idea', 'bsnl', 'recharge', 'mobile', 'internet',
  'broadband', 'wifi', 'dth', 'tata sky', 'tata play', 'dish tv', 'gpayrecharge',
];

const ELECTRICITY_WATER_PATTERNS = [
  'electricity', 'bijli', 'tata power', 'bescom', 'mseb', 'mahadiscom', 'adani electricity',
  'adani power', 'water bill', 'gas', 'lpg', 'indane', 'bharat gas', 'hp gas', 'iocl', 'indianoil',
];

const LEGACY_MAP = {
  Groceries: 'Groceries + Home',
  Housing: 'Groceries + Home',
  Transportation: 'Train Pass',
  Travel: 'Train Pass',
  'Food & Dining': 'Food Outside',
  Food: 'Food Outside',
  Subscriptions: 'OTT + Subscriptions',
  Shopping: 'Clothes / Personal',
  Entertainment: 'Entertainment / Outings',
  'Debt Payment': 'EMI',
  'Loan & EMI': 'EMI',
  Loan: 'EMI',
  EMI: 'EMI',
  Credit: 'EMI',
  Investment: 'SIP',
  Investments: 'SIP',
  Insurance: 'Insurance Buffer',
  Healthcare: 'Medical / Pharmacy',
  Medical: 'Medical / Pharmacy',
  Family: 'Family Support',
  Friend: 'Friends & Social',
  Friends: 'Friends & Social',
  Miscellaneous: 'Misc Buffer',
  General: 'Misc Buffer',
  Other: 'Other Expenses',
  'Other Expenses': 'Other Expenses',
  Uncategorized: 'Misc Buffer',
};

function splitUtilities(text) {
  const lower = `${text || ''}`.toLowerCase();
  const mobileHit = MOBILE_INTERNET_PATTERNS.some((p) => lower.includes(p));
  const powerHit = ELECTRICITY_WATER_PATTERNS.some((p) => lower.includes(p));
  if (mobileHit && !powerHit) return 'Mobile + Internet';
  if (powerHit && !mobileHit) return 'Electricity / Water';
  if (mobileHit && powerHit) return 'Mobile + Internet';
  return 'Needs Buffer';
}

function resolveInvestment(text) {
  const lower = `${text || ''}`.toLowerCase();
  if (/(ppf|public provident)/.test(lower)) return 'PPF';
  if (/(zerodha|groww|upstox|stock|equity|demat)/.test(lower)) return 'Direct Stocks';
  if (/(emergency|liquid|idfc)/.test(lower)) return 'Emergency Fund';
  if (/(sip|mutual|nifty|index fund)/.test(lower)) return 'SIP';
  return 'SIP';
}

function resolveInsurance(text) {
  const lower = `${text || ''}`.toLowerCase();
  if (/papa|father/.test(lower)) return 'Parents Health — Papa';
  if (/mummy|mother|mom/.test(lower)) return 'Parents Health — Mummy';
  if (/(term|life|max life|hdfc life)/.test(lower)) return 'Term Life Insurance';
  if (/(accident|pa cover)/.test(lower)) return 'Personal Accident';
  if (/(care supreme|own health|health)/.test(lower)) return 'Own Health Insurance';
  return 'Insurance Buffer';
}

function resolveTargetCategory(oldName, tx) {
  const text = `${tx.description || ''} ${tx.store || ''} ${tx.personName || ''}`;

  if ((oldName || '').toLowerCase() === 'utilities') {
    return splitUtilities(text);
  }

  if (['investment', 'investments'].includes((oldName || '').toLowerCase())) {
    return resolveInvestment(text);
  }

  if ((oldName || '').toLowerCase() === 'insurance') {
    return resolveInsurance(text);
  }

  return LEGACY_MAP[oldName] || null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const userArg = args.find((a) => a.startsWith('--user='));
  const userEmail = userArg ? userArg.split('=')[1] : null;

  const categories = await prisma.category.findMany({ where: { isDefault: true } });
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  let where = { isDeleted: false, financialCategory: 'EXPENSE' };
  if (userEmail) {
    const user = await prisma.user.findFirst({ where: { email: userEmail } });
    if (!user) throw new Error(`User not found: ${userEmail}`);
    where.userId = user.id;
    console.log(`Migrating for user: ${userEmail}`);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      description: true,
      store: true,
      personName: true,
      category: { select: { name: true } },
    },
  });

  const updatesByTarget = new Map();
  let skipped = 0;

  for (const tx of transactions) {
    const oldName = tx.category?.name;
    if (!oldName) {
      skipped++;
      continue;
    }

    const targetName = resolveTargetCategory(oldName, tx);
    if (!targetName || oldName === targetName) {
      skipped++;
      continue;
    }

    const targetId = categoryByName.get(targetName.toLowerCase());
    if (!targetId) {
      console.warn(`Missing target category: ${targetName}`);
      skipped++;
      continue;
    }

    const ids = updatesByTarget.get(targetId) ?? [];
    ids.push(tx.id);
    updatesByTarget.set(targetId, ids);
  }

  let updated = 0;
  for (const [targetId, ids] of updatesByTarget.entries()) {
    updated += ids.length;
    if (dryRun) continue;

    const chunkSize = 500;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      await prisma.transaction.updateMany({
        where: { id: { in: chunk } },
        data: { categoryId: targetId, autoCategorized: true },
      });
    }
  }

  console.log(dryRun ? '\n[DRY RUN] Would update:' : '\nUpdated:');
  console.log(`  ${updated} transactions`);
  console.log(`  ${skipped} skipped`);
  console.log(`  ${updatesByTarget.size} target categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
