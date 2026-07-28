export type AdvisorOutputFormat =
  | 'chat'
  | 'table'
  | 'html'
  | 'csv'
  | 'xlsx'
  | 'pdf'
  | 'docx';

export interface ParsedMarkdownTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

const FORMAT_PATTERNS: Array<{ format: AdvisorOutputFormat; re: RegExp }> = [
  { format: 'xlsx', re: /\b(xlsx|excel|spreadsheet|\.xls)\b/i },
  { format: 'docx', re: /\b(docx|word\s*doc|\.docx)\b/i },
  { format: 'pdf', re: /\bpdf\b/i },
  { format: 'csv', re: /\bcsv\b/i },
  { format: 'html', re: /\bhtml\b/i },
  {
    format: 'table',
    re: /\b(tabular|table\s*format|in\s+a\s+table|as\s+a\s+table|markdown\s+table)\b/i,
  },
];

/** Detect if the user asked for a specific response/export format. */
export function detectRequestedFormat(query: string): AdvisorOutputFormat {
  for (const { format, re } of FORMAT_PATTERNS) {
    if (re.test(query)) return format;
  }
  return 'chat';
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => stripInlineMarkdown(c.trim()));
}

/** Remove common inline markdown so exports/previews show plain values. */
export function stripInlineMarkdown(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/(^|[^*_])\*([^*]+)\*(?!\*)/g, '$1$2')
    .trim();
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, '')));
}

/** Extract GitHub-flavored markdown tables from assistant text. */
export function parseMarkdownTables(markdown: string): ParsedMarkdownTable[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const tables: ParsedMarkdownTable[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.includes('|')) {
      i += 1;
      continue;
    }

    const headerCells = splitTableRow(line);
    const next = lines[i + 1]?.trim() ?? '';
    if (headerCells.length < 2 || !next.includes('|')) {
      i += 1;
      continue;
    }

    const sepCells = splitTableRow(next);
    if (!isSeparatorRow(sepCells)) {
      i += 1;
      continue;
    }

    let title: string | undefined;
    for (let back = i - 1; back >= 0; back -= 1) {
      const prev = lines[back].trim();
      if (!prev) continue;
      if (/^#{1,6}\s+/.test(prev) || /^\*\*[^*]+\*\*$/.test(prev)) {
        title = prev.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').trim();
      }
      break;
    }

    const rows: string[][] = [];
    i += 2;
    while (i < lines.length) {
      const rowLine = lines[i].trim();
      if (!rowLine.includes('|')) break;
      const cells = splitTableRow(rowLine);
      if (cells.length < 2) break;
      if (isSeparatorRow(cells)) {
        i += 1;
        continue;
      }
      // Pad/truncate to header width
      const normalized = headerCells.map((_, idx) => cells[idx] ?? '');
      rows.push(normalized);
      i += 1;
    }

    tables.push({ title, headers: headerCells, rows });
  }

  return tables;
}

export function hasMarkdownTable(markdown: string): boolean {
  return parseMarkdownTables(markdown).length > 0;
}

export function formatInstructionForPrompt(format: AdvisorOutputFormat): string {
  switch (format) {
    case 'table':
    case 'xlsx':
    case 'csv':
    case 'pdf':
    case 'docx':
    case 'html':
      return [
        `OUTPUT FORMAT REQUESTED: ${format}`,
        'You MUST include at least one GitHub-flavored markdown table with a header row and separator row, e.g.:',
        '| Bucket | Planned | Actual | Variance | Performance |',
        '| --- | ---: | ---: | ---: | --- |',
        '| Needs | 20000 | 18000 | -2000 | Under (Good) |',
        'Include ALL plan buckets from structured data when comparing planned vs actual — not only over-budget ones.',
        format === 'html'
          ? 'You may also include a fenced ```html block with a clean <table> if helpful.'
          : 'Do not invent HTML unless asked for html.',
        'After the table(s), add a short plain-language summary.',
      ].join('\n');
    default:
      return [
        'When comparing planned vs actual or listing multiple metrics, prefer a markdown table.',
        'Always cover ALL plan buckets from structured data when asked about budget performance.',
      ].join('\n');
  }
}
