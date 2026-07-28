import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { jsPDF } from 'jspdf';
import {
  parseMarkdownTables,
  type AdvisorOutputFormat,
  type ParsedMarkdownTable,
} from '@/lib/advisor-format';

export interface AdvisorExportResult {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

const EXPORT_BRAND = {
  name: 'Vishnu Finance',
  logoPublicPath: '/icon-removebg-preview.png',
  tagline: 'Built with Vishnu Finance',
  footer: 'Track smarter. Plan faster. Vishnu Finance.',
};

interface ExportBrandAssets {
  logoDataUri?: string;
  logoBuffer?: Buffer;
  generatedAtLabel: string;
}

async function loadExportBrandAssets(now = new Date()): Promise<ExportBrandAssets> {
  const generatedAtLabel = now.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const logoFsPath = path.join(
    process.cwd(),
    'public',
    EXPORT_BRAND.logoPublicPath.replace(/^\//, ''),
  );
  try {
    const logoBuffer = await readFile(logoFsPath);
    return {
      logoBuffer,
      logoDataUri: `data:image/png;base64,${logoBuffer.toString('base64')}`,
      generatedAtLabel,
    };
  } catch {
    return { generatedAtLabel };
  }
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'advisor-export'
  );
}

function tablesFromMarkdown(markdown: string): ParsedMarkdownTable[] {
  const tables = parseMarkdownTables(markdown);
  if (tables.length > 0) {
    return tables.map((table) => normalizeTableForExport(table));
  }
  // Fallback: treat whole content as a single-column note
  return [
    normalizeTableForExport({
      title: 'Advisor response',
      headers: ['Content'],
      rows: markdown
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 200)
        .map((l) => [l]),
    }),
  ];
}

function normalizeTableForExport(table: ParsedMarkdownTable): ParsedMarkdownTable {
  const headers = table.headers.map((h) => h.trim());
  const rows = table.rows.map((row) =>
    headers.map((header, idx) => normalizeCellValue(row[idx] ?? '', header)),
  );
  return { ...table, headers, rows };
}

function normalizeCellValue(raw: string, header?: string): string {
  const value = raw.trim().replace(/\u00a0/g, ' ').replace(/\u2009/g, ' ');
  if (!value) return value;

  const h = (header || '').toLowerCase();
  const looksAmountHeader =
    h.includes('amount') || h.includes('amt') || h.includes('value') || h.includes('total');
  if (!looksAmountHeader) return value;

  // Model output can produce formats like: "' 4 0 , 0 9 3", "₹ 1 2 4 0", "1'240"
  const cleaned = value
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .replace(/[₹,]/g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, '');

  // Allow negatives and decimals
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return value;
  }

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return value;

  const hasDecimal = cleaned.includes('.');
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: hasDecimal ? 2 : 0,
    minimumFractionDigits: 0,
  }).format(num);
}

function toCsv(tables: ParsedMarkdownTable[], brand: ExportBrandAssets): string {
  const parts: string[] = [
    `# ${EXPORT_BRAND.name}`,
    `# ${EXPORT_BRAND.footer}`,
    `# Generated: ${brand.generatedAtLabel}`,
    '',
  ];
  for (const table of tables) {
    if (table.title) parts.push(`# ${table.title}`);
    parts.push(table.headers.map(csvEscape).join(','));
    for (const row of table.rows) {
      parts.push(row.map(csvEscape).join(','));
    }
    parts.push('');
  }
  return parts.join('\n');
}

function csvEscape(value: string): string {
  const v = value.replace(/"/g, '""');
  return /[",\n]/.test(v) ? `"${v}"` : v;
}

function toHtml(tables: ParsedMarkdownTable[], title: string, brand: ExportBrandAssets): string {
  const sections = tables
    .map((table) => {
      const caption = table.title ? `<h2>${escapeHtml(table.title)}</h2>` : '';
      const head = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
      const body = table.rows
        .map(
          (row) =>
            `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`,
        )
        .join('\n');
      return `${caption}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; color: #111; }
    h1 { font-size: 1.4rem; margin: 0; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; }
    .brand-header { display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid #e6e6e6; padding-bottom: 0.75rem; margin-bottom: 1rem; }
    .brand-header img { width: 36px; height: 36px; object-fit: contain; }
    .brand-meta { color: #5f6368; font-size: 0.86rem; margin-top: 0.2rem; }
    table { border-collapse: collapse; width: 100%; margin: 0.75rem 0 1.5rem; font-size: 0.95rem; }
    th, td { border: 1px solid #ccc; padding: 0.45rem 0.6rem; text-align: left; }
    th { background: #f4f4f4; }
    td:nth-child(n+2) { font-variant-numeric: tabular-nums; }
    .brand-footer { margin-top: 2rem; border-top: 1px solid #e6e6e6; padding-top: 0.75rem; color: #5f6368; font-size: 0.86rem; }
  </style>
</head>
<body>
  <header class="brand-header">
    ${
      brand.logoDataUri
        ? `<img src="${brand.logoDataUri}" alt="${escapeHtml(EXPORT_BRAND.name)} logo" />`
        : ''
    }
    <div>
      <h1>${escapeHtml(title)}</h1>
      <div class="brand-meta">${escapeHtml(EXPORT_BRAND.name)} · ${escapeHtml(
        EXPORT_BRAND.tagline,
      )} · Generated ${escapeHtml(brand.generatedAtLabel)}</div>
    </div>
  </header>
  ${sections}
  <footer class="brand-footer">${escapeHtml(EXPORT_BRAND.footer)}</footer>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function toXlsx(
  tables: ParsedMarkdownTable[],
  title: string,
  brand: ExportBrandAssets,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Vishnu Finance Advisor';
  workbook.created = new Date();

  tables.forEach((table, idx) => {
    const name = (table.title || `Sheet ${idx + 1}`).slice(0, 28) || `Sheet${idx + 1}`;
    const sheet = workbook.addWorksheet(name);
    sheet.addRow([EXPORT_BRAND.name]);
    sheet.addRow([EXPORT_BRAND.footer]);
    sheet.addRow([`Generated: ${brand.generatedAtLabel}`]);
    sheet.addRow([]);
    sheet.addRow(table.headers);
    sheet.getRow(1).font = { bold: true, size: 13 };
    sheet.getRow(2).font = { italic: true, color: { argb: 'FF666666' } };
    sheet.getRow(3).font = { size: 10, color: { argb: 'FF666666' } };
    sheet.getRow(5).font = { bold: true };
    for (const row of table.rows) sheet.addRow(row);
    sheet.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        max = Math.max(max, String(cell.value ?? '').length);
      });
      col.width = Math.min(42, max + 2);
    });
  });

  if (tables.length === 0) {
    const sheet = workbook.addWorksheet('Export');
    sheet.addRow([title]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

async function toDocx(
  tables: ParsedMarkdownTable[],
  title: string,
  brand: ExportBrandAssets,
): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      children: [
        new TextRun({ text: EXPORT_BRAND.name, bold: true, size: 22 }),
        new TextRun({ text: `  ${EXPORT_BRAND.tagline}`, size: 20 }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 28 })],
      spacing: { after: 140 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${brand.generatedAtLabel}`, size: 18 })],
      spacing: { after: 220 },
    }),
  ];

  if (brand.logoBuffer) {
    children.unshift(
      new Paragraph({
        children: [
          new ImageRun({
            data: brand.logoBuffer,
            transformation: { width: 52, height: 52 },
            type: 'png',
          }),
        ],
        spacing: { after: 100 },
      }),
    );
  }

  for (const table of tables) {
    if (table.title) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: table.title, bold: true, size: 24 })],
          spacing: { before: 200, after: 120 },
        }),
      );
    }

    const headerRow = new TableRow({
      children: table.headers.map(
        (h) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            width: { size: Math.floor(9000 / Math.max(table.headers.length, 1)), type: WidthType.DXA },
          }),
      ),
    });

    const dataRows = table.rows.map(
      (row) =>
        new TableRow({
          children: table.headers.map((_, idx) => {
            const text = row[idx] ?? '';
            return new TableCell({
              children: [new Paragraph(text)],
              width: {
                size: Math.floor(9000 / Math.max(table.headers.length, 1)),
                type: WidthType.DXA,
              },
            });
          }),
        }),
    );

    children.push(
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [headerRow, ...dataRows],
      }),
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: EXPORT_BRAND.footer, italics: true, size: 18 })],
      spacing: { before: 220 },
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

async function toPdf(
  tables: ParsedMarkdownTable[],
  title: string,
  brand: ExportBrandAssets,
): Promise<Buffer> {
  const hasWideTable = tables.some((t) => t.headers.length >= 6);
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: hasWideTable ? 'landscape' : 'portrait',
  });
  const margin = 32;
  const headerReserve = 70;
  const footerReserve = 30;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin + headerReserve;

  const lineHeight = 9;
  const rowPaddingY = 4;
  const cellPaddingX = 4;
  const fontSize = 7.5;

  const drawBrandHeader = () => {
    const headerTop = margin - 8;
    if (brand.logoDataUri) {
      try {
        doc.addImage(brand.logoDataUri, 'PNG', margin, headerTop, 24, 24);
      } catch {
        // Ignore image errors and keep text branding.
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(EXPORT_BRAND.name, margin + 30, headerTop + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${EXPORT_BRAND.tagline} · ${brand.generatedAtLabel}`, margin + 30, headerTop + 22);
    doc.setDrawColor(220);
    doc.line(margin, margin + 24, pageWidth - margin, margin + 24);
  };

  const drawBrandFooter = (pageNumber: number) => {
    const footerY = pageHeight - margin + 4;
    doc.setDrawColor(220);
    doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(EXPORT_BRAND.footer, margin, footerY);
    doc.text(`Page ${pageNumber}`, pageWidth - margin - 30, footerY, { align: 'right' });
  };

  const guessWeight = (header: string): number => {
    const h = header.toLowerCase();
    if (h.includes('description') || h.includes('narration') || h.includes('remark')) return 3.6;
    if (h.includes('store') || h.includes('merchant') || h.includes('business')) return 1.9;
    if (h.includes('person') || h.includes('counterparty')) return 1.7;
    if (h.includes('category')) return 1.5;
    if (h.includes('date')) return 1.2;
    if (h.includes('amount')) return 1.2;
    if (h.includes('type')) return 1.0;
    return 1.3;
  };

  const buildColumnWidths = (headers: string[]): number[] => {
    const weights = headers.map(guessWeight);
    const total = weights.reduce((a, b) => a + b, 0) || headers.length || 1;
    return weights.map((w) => (w / total) * contentWidth);
  };

  const drawTableHeader = (headers: string[], widths: number[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);

    const wrapped = headers.map((h, idx) =>
      doc.splitTextToSize(h || '', Math.max(10, widths[idx] - cellPaddingX * 2)),
    );
    const maxLines = Math.max(...wrapped.map((l) => l.length), 1);
    const rowHeight = maxLines * lineHeight + rowPaddingY * 2;

    let x = margin;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');

    for (let i = 0; i < headers.length; i += 1) {
      const lines = wrapped[i];
      doc.text(lines, x + cellPaddingX, y + rowPaddingY + lineHeight - 1);
      doc.setDrawColor(200);
      doc.rect(x, y, widths[i], rowHeight);
      x += widths[i];
    }
    y += rowHeight;
  };

  const drawDataRow = (cells: string[], widths: number[]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);

    const wrapped = cells.map((cell, idx) =>
      doc.splitTextToSize(cell || '', Math.max(10, widths[idx] - cellPaddingX * 2)),
    );
    const maxLines = Math.max(...wrapped.map((l) => l.length), 1);
    const rowHeight = maxLines * lineHeight + rowPaddingY * 2;

    let x = margin;
    for (let i = 0; i < cells.length; i += 1) {
      const lines = wrapped[i];
      doc.text(lines, x + cellPaddingX, y + rowPaddingY + lineHeight - 1);
      doc.setDrawColor(220);
      doc.rect(x, y, widths[i], rowHeight);
      x += widths[i];
    }
    y += rowHeight;
  };

  const resetPageCursor = () => {
    y = margin + headerReserve;
  };
  let pageCount = 1;
  drawBrandHeader();
  resetPageCursor();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 20;

  for (const table of tables) {
    if (y > pageHeight - footerReserve - 70) {
      drawBrandFooter(pageCount);
      doc.addPage();
      pageCount += 1;
      drawBrandHeader();
      resetPageCursor();
    }
    if (table.title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(table.title, margin, y);
      y += 14;
    }

    const headers = table.headers.length > 0 ? table.headers : ['Content'];
    const widths = buildColumnWidths(headers);
    drawTableHeader(headers, widths);

    for (const row of table.rows) {
      const cells = headers.map((_, i) => row[i] ?? '');
      // Keep a little safe space for the next row; if not, move page + redraw header.
      if (y > pageHeight - footerReserve - 26) {
        drawBrandFooter(pageCount);
        doc.addPage();
        pageCount += 1;
        drawBrandHeader();
        resetPageCursor();
        drawTableHeader(headers, widths);
      }
      drawDataRow(cells, widths);
    }
    y += 10;
  }
  drawBrandFooter(pageCount);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export async function exportAdvisorMarkdown(args: {
  markdown: string;
  format: Exclude<AdvisorOutputFormat, 'chat' | 'table'>;
  title?: string;
}): Promise<AdvisorExportResult> {
  const title = args.title?.trim() || 'Vishnu Finance — Advisor export';
  const tables = tablesFromMarkdown(args.markdown);
  const base = slugify(title);
  const brand = await loadExportBrandAssets();

  switch (args.format) {
    case 'csv':
      return {
        filename: `${base}.csv`,
        mimeType: 'text/csv; charset=utf-8',
        buffer: Buffer.from(toCsv(tables, brand), 'utf8'),
      };
    case 'html':
      return {
        filename: `${base}.html`,
        mimeType: 'text/html; charset=utf-8',
        buffer: Buffer.from(toHtml(tables, title, brand), 'utf8'),
      };
    case 'xlsx':
      return {
        filename: `${base}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: await toXlsx(tables, title, brand),
      };
    case 'docx':
      return {
        filename: `${base}.docx`,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: await toDocx(tables, title, brand),
      };
    case 'pdf':
      return {
        filename: `${base}.pdf`,
        mimeType: 'application/pdf',
        buffer: await toPdf(tables, title, brand),
      };
    default:
      throw new Error(`Unsupported export format: ${args.format}`);
  }
}
