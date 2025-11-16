/* 
Simple dev test runner to validate parser + importer parity using local Next.js server.
Usage:
  ts-node scripts/test-parse-import.ts http://localhost:3000 \
    "vishnu-finance/AccountStatement_28-10-2025 11_00_46.pdf" \
    "vishnu-finance/AccountStatement_04-11-2025 20_05_13.pdf" \
    "vishnu-finance/Acct Statement_7094_01112025_21.42.06 - converted.pdf" \
    <USER_ID>
*/

import fs from 'fs';
import path from 'path';

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function run() {
	const [, , baseUrlArg, pdf1, pdf2, pdf3, userId] = process.argv;
	const baseUrl = baseUrlArg || 'http://localhost:3000';
	if (!pdf1 || !pdf2 || !pdf3 || !userId) {
		console.error('Usage: ts-node scripts/test-parse-import.ts <baseUrl> <pdf1> <pdf2> <pdf3> <userId>');
		process.exit(1);
	}

	const files = [pdf1, pdf2, pdf3];

	for (const filePath of files) {
		const abs = path.resolve(filePath);
		if (!fs.existsSync(abs)) {
			console.error(`File not found: ${abs}`);
			process.exit(1);
		}
	}

	for (const filePath of files) {
		console.log(`\n=== Testing: ${filePath} ===`);
		const abs = path.resolve(filePath);

		for (let i = 1; i <= 3; i++) {
			const fd = new FormData();
			fd.append('file', new Blob([fs.readFileSync(abs)]), path.basename(abs));
			const res = await fetch(`${baseUrl}/api/parse`, { method: 'POST', body: fd as any });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				console.error(`Parse failed [run ${i}]`, body);
				process.exit(1);
			}
			const transactions = Array.isArray(body?.transactions) ? body.transactions : [];
			const metadata = body?.metadata || {};
			console.log(`Run ${i}: parsed=${transactions.length}, bankCode=${metadata?.bankCode || body?.bankType || 'UNKNOWN'}`);
			if (metadata?.openingBalance != null || metadata?.closingBalance != null || metadata?.accountNumber) {
				console.log(`  metadata: opening=${metadata.openingBalance}, closing=${metadata.closingBalance}, account=${metadata.accountNumber}`);
			}

			// Import immediately
			const importPayload = {
				userId,
				records: transactions,
				metadata,
				useAICategorization: true,
				validateBalance: true,
				categorizeInBackground: true,
			};
			const ir = await fetch(`${baseUrl}/api/import`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(importPayload),
			});
			const irb = await ir.json().catch(() => ({}));
			if (!ir.ok) {
				console.error('Import failed', irb);
				process.exit(1);
			}
			console.log(`Import: inserted=${irb.inserted}, duplicates=${irb.duplicates}`);
			await sleep(500);
		}
	}

	console.log('\nAll tests completed.');
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});


