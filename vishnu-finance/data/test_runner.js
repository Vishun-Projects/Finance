const fs = require('fs');
const path = require('path');

const API_URL = process.env.PARSE_API_URL || 'http://localhost:3000/api/parse-pdf';
const DATA_DIR = __dirname;
const STATEMENTS_DIR = path.join(DATA_DIR, 'statements');
const GOLDEN_PATH = path.join(DATA_DIR, 'golden-expectations.json');

const FOOTER_NOISE = [
  'closingbalanceincludes',
  'contentsofthisstatement',
  'registeredofficeaddress',
  'hdfcbankgstin',
  'correctifnoerror',
];

function loadGoldenConfig() {
  if (!fs.existsSync(GOLDEN_PATH)) return { baselines: [], footerNoisePatterns: FOOTER_NOISE };
  return JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
}

function countFooterNoise(transactions) {
  let count = 0;
  for (const txn of transactions || []) {
    const desc = String(txn.description || '').toLowerCase().replace(/\s+/g, '');
    if (FOOTER_NOISE.some((pattern) => desc.includes(pattern.replace(/\s+/g, '')))) {
      count += 1;
    }
  }
  return count;
}

function summarizeValidation(metadata) {
  const validation = metadata?.validation || {};
  return {
    valid: Boolean(validation.valid),
    reconciled: Boolean(validation.reconciled),
    mismatchCount: validation.mismatch_count || 0,
    openingBalance: validation.opening_balance,
    closingBalance: validation.closing_balance,
  };
}

async function parseFile(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  const formData = new FormData();
  const blob = new Blob([fileContent]);
  formData.append('file', blob, fileName);

  const response = await fetch(API_URL, { method: 'POST', body: formData });
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.substring(0, 120)}`);
  }
  return result;
}

async function run() {
  console.log('Starting golden parse test runner...');
  console.log(`Target API: ${API_URL}`);

  const golden = loadGoldenConfig();
  const searchDirs = [STATEMENTS_DIR, DATA_DIR].filter((dir) => fs.existsSync(dir));
  const validExts = ['.pdf', '.xlsx', '.xls', '.txt'];

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const dir of searchDirs) {
    for (const file of fs.readdirSync(dir)) {
      const ext = path.extname(file).toLowerCase();
      if (!validExts.includes(ext)) continue;

      console.log(`\n----------------------------------------`);
      console.log(`Processing: ${file}`);

      try {
        const filePath = path.join(dir, file);
        const result = await parseFile(filePath, file);

        if (!result.success) {
          console.log(`❌ FAILED: ${result.error || 'unknown error'}`);
          failed += 1;
          continue;
        }

        const transactions = result.transactions || [];
        const count = transactions.length;
        const validation = summarizeValidation(result.metadata);
        const footerNoise = countFooterNoise(transactions);
        const parserMethod = result.parserMethod || result.metadata?.parserMethod || 'unknown';

        console.log(`Parser method: ${parserMethod}`);
        console.log(`Transactions: ${count}`);
        console.log(`Validation: valid=${validation.valid} reconciled=${validation.reconciled} mismatches=${validation.mismatchCount}`);
        console.log(`Footer noise rows: ${footerNoise}`);

        if (count === 0) {
          console.log('⚠️ WARNING: 0 transactions extracted');
          failed += 1;
          continue;
        }

        if (footerNoise > 0) {
          console.log(`❌ FAILED: ${footerNoise} transaction(s) contain footer/legal noise`);
          failed += 1;
          continue;
        }

        if (!validation.reconciled && validation.mismatchCount > 5) {
          console.log('❌ FAILED: balance reconciliation mismatch count too high');
          failed += 1;
          continue;
        }

        console.log('✅ PASSED');
        passed += 1;
      } catch (error) {
        console.error(`❌ ERROR: ${error.message}`);
        failed += 1;
      }
    }
  }

  if (passed + failed === 0) {
    console.log('\nNo statement files found. Place PDFs in data/statements/ to run golden tests.');
    skipped += 1;
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
