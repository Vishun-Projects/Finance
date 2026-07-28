import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { exportAdvisorMarkdown } from '../src/lib/advisor-export';

async function main() {
  const outDir = join(process.cwd(), 'data', 'export-samples');
  mkdirSync(outDir, { recursive: true });

  const markdown = `## Transactions for May 30, 2026

| Date | Type | Amount | Category | Description | Store | Person |
| --- | --- | ---: | --- | --- | --- | --- |
| 2026-05-30 | EXPENSE | 1240 | Medical/Pharmacy | CNRBO...UPI/61500 18 | - | Swapnil Shuas |
| 2026-05-30 | INCOME | 140093 | Income | TRANSFER FROM ... | Western | - |
| 2026-06-30 | EXPENSE | 13000 | Food Outside | KKBK000... | - | Hehe |`;

  const formats = ['pdf', 'html', 'docx', 'csv', 'xlsx'] as const;
  for (const format of formats) {
    const result = await exportAdvisorMarkdown({
      markdown,
      format,
      title: 'Advisor export sample',
    });
    const filepath = join(outDir, result.filename);
    writeFileSync(filepath, result.buffer);
    console.log(`generated ${result.filename}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
