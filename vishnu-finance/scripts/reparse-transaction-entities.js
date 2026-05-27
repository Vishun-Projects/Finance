/**
 * Re-parse person/store/UPI fields from existing transaction descriptions.
 *
 * Usage:
 *   node scripts/reparse-transaction-entities.js [userEmail] [--start=YYYY-MM-DD] [--end=YYYY-MM-DD] [--dry-run]
 */
const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BANK_DESCRIPTION_PREFIX = /^(YESB|HDFC|KKBK|ICIC|SBIN|UBIN|AXIS|IDFB|CNRB|BARB|MAHB|BKID|PUNB)/i;

function extractUpiRefs(text) {
  if (!text) return [];
  return [...`${text}`.matchAll(/UPI\/\s*(\d{8,})/gi)].map((match) => match[1].replace(/\s/g, ''));
}

function extractVpas(text) {
  if (!text) return [];
  return [...`${text}`.matchAll(/[\w.+-]+@[\w.-]+/gi)].map((match) => match[0].toLowerCase());
}

function notesBelongToTransaction(notes, description) {
  if (!notes) return true;
  if (!description) return true;
  if (notes.trim() === description.trim()) return true;

  // Short human notes (e.g. "milk", "tea") are fine.
  if (!BANK_DESCRIPTION_PREFIX.test(notes.trim()) && notes.length < 120) {
    return true;
  }

  const noteRefs = extractUpiRefs(notes);
  const descRefs = extractUpiRefs(description);
  if (noteRefs.length > 0 && descRefs.length > 0 && noteRefs.some((ref) => descRefs.includes(ref))) {
    return true;
  }

  const noteVpas = extractVpas(notes);
  const descVpas = extractVpas(description);
  if (noteVpas.length > 0 && descVpas.length > 0 && noteVpas.some((vpa) => descVpas.includes(vpa))) {
    return true;
  }

  return false;
}

function deriveNotes(parsed, description, currentNotes) {
  const commodity = parsed.commodity;
  if (commodity && commodity !== 'UPI Transfer' && commodity !== 'General') {
    return commodity;
  }

  if (currentNotes && notesBelongToTransaction(currentNotes, description)) {
    // Notes should hold purpose/commodity, not a duplicate bank description.
    if (BANK_DESCRIPTION_PREFIX.test(currentNotes.trim()) && currentNotes.trim() === `${description || ''}`.trim()) {
      return null;
    }
    return currentNotes;
  }

  return null;
}

function parseArgs(argv) {
  const email = argv[2] && !argv[2].startsWith('--') ? argv[2] : 'vishun.orv@gmail.com';
  const start = argv.find((arg) => arg.startsWith('--start='))?.split('=')[1];
  const end = argv.find((arg) => arg.startsWith('--end='))?.split('=')[1];
  const dryRun = argv.includes('--dry-run');
  return { email, start, end, dryRun };
}

function extractEntities(descriptions) {
  const scriptPath = path.join(__dirname, '..', 'api', 'parse-pdf-python', 'scripts', 'batch_extract_entities.py');
  const result = spawnSync('python', [scriptPath], {
    input: JSON.stringify(descriptions),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Python batch extraction failed');
  }

  return JSON.parse(result.stdout || '{}');
}

async function main() {
  const { email, start, end, dryRun } = parseArgs(process.argv);

  const user = await prisma.user.findFirst({ where: { email }, select: { id: true, email: true } });
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const where = {
    userId: user.id,
    isDeleted: false,
    description: { not: null },
  };

  if (start || end) {
    where.transactionDate = {};
    if (start) where.transactionDate.gte = new Date(`${start}T00:00:00`);
    if (end) where.transactionDate.lte = new Date(`${end}T23:59:59.999`);
  }

  const rows = await prisma.transaction.findMany({
    where,
    select: { id: true, description: true, personName: true, store: true, upiId: true, notes: true },
  });

  const uniqueDescriptions = [...new Set(rows.map((row) => row.description).filter(Boolean))];
  console.log(`Re-parsing ${rows.length} transactions (${uniqueDescriptions.length} unique descriptions) for ${user.email}`);

  const extractedByDescription = {};
  const chunkSize = 250;
  for (let i = 0; i < uniqueDescriptions.length; i += chunkSize) {
    const chunk = uniqueDescriptions.slice(i, i + chunkSize);
    Object.assign(extractedByDescription, extractEntities(chunk));
    process.stdout.write(`  parsed ${Math.min(i + chunkSize, uniqueDescriptions.length)}/${uniqueDescriptions.length}\n`);
  }

  let updated = 0;
  const batch = [];

  for (const row of rows) {
    const parsed = extractedByDescription[row.description];
    if (!parsed) continue;

    const next = {
      personName: parsed.personName || null,
      store: parsed.store || null,
      upiId: parsed.upiId || null,
      notes: deriveNotes(parsed, row.description, row.notes),
    };

    const changed =
      next.personName !== row.personName
      || next.store !== row.store
      || next.upiId !== row.upiId
      || next.notes !== row.notes;

    if (!changed) continue;

    updated += 1;
    if (!dryRun) {
      batch.push(
        prisma.transaction.update({
          where: { id: row.id },
          data: next,
        }),
      );
    }
  }

  if (!dryRun && batch.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < batch.length; i += batchSize) {
      await Promise.all(batch.slice(i, i + batchSize));
    }
  }

  console.log(`${dryRun ? '[dry-run] would update' : 'updated'} ${updated} transactions`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
