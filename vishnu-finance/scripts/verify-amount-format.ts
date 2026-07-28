import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { exportAdvisorMarkdown } from '../src/lib/advisor-export';

async function main() {
  const outDir = join(process.cwd(), 'data', 'export-samples');
  mkdirSync(outDir, { recursive: true });
  const markdown = `## Amount check

| Date | Amount |
| --- | ---: |
| 2026-05-30 | ' 4 0 , 0 9 3 |
| 2026-05-31 | ₹ 1 2 4 0 |
| 2026-06-01 | 1'150 |
| 2026-06-02 | 18.4 |`;
  const html = await exportAdvisorMarkdown({
    markdown,
    format: 'html',
    title: 'Amount formatting check',
  });
  writeFileSync(join(outDir, 'amount-format-check.html'), html.buffer);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
