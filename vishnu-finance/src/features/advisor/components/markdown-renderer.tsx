'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableCells(line);
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, '')));
}

function looksLikeTableRow(line: string): boolean {
  const t = line.trim();
  return t.includes('|') && splitTableCells(t).length >= 2;
}

/**
 * Simple markdown renderer for chat messages
 * Handles: bold, italic, code, lists, tables, line breaks, icons, headings, horizontal rules
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  let safe = content;
  const tickCount = (safe.match(/`/g) || []).length;
  if (tickCount % 2 === 1) {
    safe += '`';
  }

  const lines = safe.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let i = 0;

  const flushList = (key: string) => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={key} className="my-2 ml-4 list-inside list-disc space-y-1">
          {listItems}
        </ul>,
      );
      listItems = [];
      inList = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const index = i;

    if (trimmed === '') {
      flushList(`list-${index}`);
      i += 1;
      continue;
    }

    // Markdown table block
    if (
      looksLikeTableRow(trimmed) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      flushList(`list-before-table-${index}`);
      const headers = splitTableCells(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && looksLikeTableRow(lines[i]) && !isTableSeparator(lines[i])) {
        const cells = splitTableCells(lines[i]);
        rows.push(headers.map((_, idx) => cells[idx] ?? ''));
        i += 1;
      }
      elements.push(
        <div
          key={`table-wrap-${index}`}
          className="my-3 overflow-x-auto rounded-lg border border-border/70"
        >
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                {headers.map((h, hi) => (
                  <th
                    key={`th-${index}-${hi}`}
                    className="border-b border-border/70 px-3 py-2 font-semibold"
                  >
                    {processInlineMarkdown(h, h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={`tr-${index}-${ri}`} className="odd:bg-background even:bg-muted/15">
                  {row.map((cell, ci) => (
                    <td
                      key={`td-${index}-${ri}-${ci}`}
                      className="border-b border-border/40 px-3 py-1.5 align-top tabular-nums"
                    >
                      {processInlineMarkdown(cell, cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const hrMatch = trimmed.match(/^(-{3,}|\*{3,}|_{3,})$/);
    if (hrMatch) {
      flushList(`list-${index}`);
      elements.push(<hr key={`hr-${index}`} className="my-4 border-border" />);
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList(`list-${index}`);
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const processed = processInlineMarkdown(headingText, trimmed);
      const headingClasses = {
        1: 'text-2xl font-bold my-4',
        2: 'text-xl font-bold my-3',
        3: 'text-lg font-semibold my-3',
        4: 'text-base font-semibold my-2',
        5: 'text-sm font-semibold my-2',
        6: 'text-sm font-medium my-2',
      };
      const cls = headingClasses[level as keyof typeof headingClasses] || headingClasses[6];
      const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
      elements.push(
        <HeadingTag key={`heading-${index}`} className={cls}>
          {processed}
        </HeadingTag>,
      );
      i += 1;
      continue;
    }

    const listMatch = trimmed.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const itemContent = processInlineMarkdown(listMatch[2], trimmed);
      listItems.push(
        <li key={`item-${index}`} className="ml-2">
          {itemContent}
        </li>,
      );
      inList = true;
      i += 1;
      continue;
    }

    flushList(`list-${index}`);
    const processed = processInlineMarkdown(trimmed, trimmed);
    elements.push(
      <p key={`para-${index}`} className="my-2">
        {processed}
      </p>,
    );
    i += 1;
  }

  flushList('list-final');

  return <div className={`markdown-content ${className}`}>{elements}</div>;
}

function kebabToPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function getIconComponent(
  iconName: string,
): React.ComponentType<{ className?: string; size?: number }> | null {
  const pascalName = kebabToPascalCase(iconName);
  const IconComponent = (LucideIcons as any)[pascalName];
  return IconComponent || null;
}

const MONEY_RE =
  /(?:₹|Rs\.?\s?|INR\s?)?-?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|(?:₹|Rs\.?\s?|INR\s?)-?\d+(?:\.\d+)?/i;

function isMoneyToken(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[₹]|^(?:Rs\.?|INR)\b/i.test(t)) return MONEY_RE.test(t);
  return /^[+-]?\d{1,3}(?:,\d{2,3})+(?:\.\d+)?$/.test(t) || /^[+-]?\d+\.\d{2}$/.test(t);
}

function parseMoneySign(text: string): number {
  const cleaned = text.replace(/[₹,\s]|Rs\.?|INR/gi, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

type AmountTone = 'credit' | 'debit' | 'neutral';

function amountTone(token: string, lineContext: string): AmountTone {
  const value = parseMoneySign(token);
  const ctx = lineContext.toLowerCase();

  const debitCue =
    /\b(spend|spent|spending|expense|expenses|debit|due|overdue|over[-\s]?budget|outflow|loss|negative|exceed|bill)\b/.test(
      ctx,
    );
  const creditCue =
    /\b(income|credit|credited|saved|saving|under[-\s]?budget|inflow|surplus|gain|received|earn)\b/.test(
      ctx,
    );

  if (value < 0) return 'debit';
  if (value === 0) return 'neutral';
  if (debitCue && !creditCue) return 'debit';
  if (creditCue && !debitCue) return 'credit';
  if (/\bnet\b/.test(ctx) && value < 0) return 'debit';
  if (/\bnet\b/.test(ctx)) return value >= 0 ? 'credit' : 'debit';
  return 'credit';
}

function MoneyAmount({ text, tone }: { text: string; tone: AmountTone }) {
  return (
    <span
      className={
        tone === 'debit'
          ? 'font-semibold tabular-nums text-[var(--danger)]'
          : tone === 'credit'
            ? 'font-semibold tabular-nums text-[var(--success)]'
            : 'font-medium tabular-nums text-muted'
      }
    >
      {text}
    </span>
  );
}

function colorMoneyInPlainText(
  text: string,
  lineContext: string,
  keyStart: number,
): { nodes: React.ReactNode[]; nextKey: number } {
  const nodes: React.ReactNode[] = [];
  let key = keyStart;
  const re =
    /(?:₹|Rs\.?\s?|INR\s?)-?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|(?:₹|Rs\.?\s?|INR\s?)-?\d+(?:\.\d+)?/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    }
    const token = match[0];
    nodes.push(
      <MoneyAmount key={key++} text={token} tone={amountTone(token, lineContext)} />,
    );
    last = match.index + token.length;
  }
  if (last < text.length) {
    nodes.push(<span key={key++}>{text.slice(last)}</span>);
  }
  if (nodes.length === 0) {
    nodes.push(<span key={key++}>{text}</span>);
  }
  return { nodes, nextKey: key };
}

function processInlineMarkdown(text: string, lineContext = text): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
    { regex: /\*([^*]+)\*/g, type: 'italic' },
    { regex: /`([^`]+)`/g, type: 'code' },
    { regex: /:([a-z0-9-]+):/g, type: 'icon' },
  ];

  const matches: Array<{ start: number; end: number; type: string; content: string }> = [];

  patterns.forEach(({ regex, type }) => {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
        content: match[1],
      });
    }
  });

  matches.sort((a, b) => a.start - b.start);

  const nonOverlapping: typeof matches = [];
  for (const match of matches) {
    const overlaps = nonOverlapping.some(
      (m) => !(match.end <= m.start || match.start >= m.end),
    );
    if (!overlaps) {
      nonOverlapping.push(match);
    }
  }

  let lastIndex = 0;
  nonOverlapping.forEach((match) => {
    if (match.start > lastIndex) {
      const beforeText = text.substring(lastIndex, match.start);
      if (beforeText) {
        const colored = colorMoneyInPlainText(beforeText, lineContext, key);
        parts.push(...colored.nodes);
        key = colored.nextKey;
      }
    }

    if (match.type === 'bold') {
      if (isMoneyToken(match.content)) {
        parts.push(
          <MoneyAmount
            key={key++}
            text={match.content}
            tone={amountTone(match.content, lineContext)}
          />,
        );
      } else {
        const inner = colorMoneyInPlainText(match.content, lineContext, key + 1);
        parts.push(
          <strong key={key} className="font-semibold">
            {inner.nodes}
          </strong>,
        );
        key = inner.nextKey;
      }
    } else if (match.type === 'italic') {
      parts.push(
        <em key={key++} className="italic">
          {match.content}
        </em>,
      );
    } else if (match.type === 'code') {
      if (isMoneyToken(match.content)) {
        parts.push(
          <MoneyAmount
            key={key++}
            text={match.content}
            tone={amountTone(match.content, lineContext)}
          />,
        );
      } else {
        parts.push(
          <code
            key={key++}
            className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.9em]"
          >
            {match.content}
          </code>,
        );
      }
    } else if (match.type === 'icon') {
      const IconComponent = getIconComponent(match.content);
      if (IconComponent) {
        parts.push(
          <IconComponent
            key={key++}
            className="mx-0.5 inline-block align-middle"
            size={16}
            aria-label={match.content}
          />,
        );
      } else {
        parts.push(<span key={key++}>:{match.content}:</span>);
      }
    }

    lastIndex = match.end;
  });

  if (lastIndex < text.length) {
    const colored = colorMoneyInPlainText(text.substring(lastIndex), lineContext, key);
    parts.push(...colored.nodes);
    key = colored.nextKey;
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
}
