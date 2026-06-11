import { generateDedupHash, areDescriptionsSimilar, buildInFileDedupKey } from './import-dedup';
import { prisma } from '@/lib/db';
import { toLocalISODate } from './date-range';
import { getCurrentAccountBalance } from '@/lib/account-balance-service';
import {
  enrichStatementMetadataFromRecords,
  type StatementMetadata,
} from '@/lib/account-statement';

export interface ImportPreviewRecord {
  date?: string;
  date_iso?: string;
  debit?: number | string;
  credit?: number | string;
  description?: string;
  store?: string;
  personName?: string;
  category?: string;
  transactionId?: string;
  balance?: number | string;
  accountNumber?: string;
  bankCode?: string;
}

export interface ImportPreviewDuplicate {
  index: number;
  existingId: string;
  date: string;
  amount: number;
  description: string;
  matchType: 'dedupHash' | 'transactionId' | 'fuzzy';
}

export interface PayeeCategoryOption {
  categoryId: string;
  categoryName: string;
  count: number;
}

export interface ImportPreviewPayee {
  key: string;
  displayName: string;
  entityType: 'person' | 'store';
  bucket: 'known' | 'new' | 'conflict';
  occurrences: number;
  categories?: PayeeCategoryOption[];
  suggestedCategoryId?: string | null;
  suggestedCategoryName?: string | null;
}

export interface ImportPreviewResult {
  statementPeriod: { start: string | null; end: string | null };
  overlap: {
    hasOverlap: boolean;
    overlappingDays: number;
    existingStatementId?: string;
    message?: string;
  };
  counts: { new: number; duplicate: number; updatable: number; inFileDuplicate: number };
  duplicates: ImportPreviewDuplicate[];
  payees: ImportPreviewPayee[];
  balance: {
    parsedClosing: number | null;
    lastStoredBalance: number | null;
    latestImportAt: string | null;
  };
}

export { generateDedupHash, countInFileDuplicateRecords } from './import-dedup';

function parseDate(record: ImportPreviewRecord): Date | null {
  const raw = record.date_iso || record.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function payeeKey(record: ImportPreviewRecord): string | null {
  const store = record.store?.trim();
  if (store) return `store:${store.toLowerCase()}`;
  const person = record.personName?.trim();
  if (person) return `person:${person.toLowerCase()}`;
  return null;
}

export async function buildImportPreview(
  userId: string,
  records: ImportPreviewRecord[],
  metadata?: StatementMetadata,
): Promise<ImportPreviewResult> {
  const enriched = enrichStatementMetadataFromRecords(metadata, records);
  const statementPeriod = {
    start: enriched?.statementStartDate ?? metadata?.statementStartDate ?? null,
    end: enriched?.statementEndDate ?? metadata?.statementEndDate ?? null,
  };

  const seenInFile = new Set<string>();
  const uniqueIndices: number[] = [];
  let inFileDuplicate = 0;

  records.forEach((record, index) => {
    const date = parseDate(record);
    if (!date) return;
    const key = buildInFileDedupKey({
      transactionDate: date,
      description: record.description || '',
      creditAmount: Number(record.credit) || 0,
      debitAmount: Number(record.debit) || 0,
      transactionId: record.transactionId,
      balance: record.balance != null ? Number(record.balance) : null,
    });
    if (seenInFile.has(key)) {
      inFileDuplicate++;
      return;
    }
    seenInFile.add(key);
    uniqueIndices.push(index);
  });

  const dates = uniqueIndices
    .map((i) => parseDate(records[i]))
    .filter((d): d is Date => d != null);
  const range =
    dates.length > 0
      ? {
          min: new Date(Math.min(...dates.map((d) => d.getTime()))),
          max: new Date(Math.max(...dates.map((d) => d.getTime()))),
        }
      : null;

  const expandedRange = range
    ? {
        gte: new Date(range.min.getTime() - 30 * 24 * 60 * 60 * 1000),
        lte: new Date(range.max.getTime() + 30 * 24 * 60 * 60 * 1000),
      }
    : undefined;

  const existing = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      ...(expandedRange ? { transactionDate: expandedRange } : {}),
    },
    select: {
      id: true,
      description: true,
      creditAmount: true,
      debitAmount: true,
      transactionDate: true,
      transactionId: true,
      dedupHash: true,
      store: true,
      personName: true,
      category: { select: { id: true, name: true } },
    },
  });

  const existingByHash = new Map(
    existing.filter((e) => e.dedupHash).map((e) => [e.dedupHash as string, e]),
  );
  const existingIds = new Set(
    existing.map((e) => e.transactionId).filter((id): id is string => Boolean(id?.trim())),
  );
  const existingBuckets = new Map<string, Array<{ description: string; id: string }>>();

  existing.forEach((e) => {
    try {
      const dateStr = toLocalISODate(new Date(e.transactionDate));
      const bucketKey = `${dateStr}|${Number(e.creditAmount).toFixed(2)}|${Number(e.debitAmount).toFixed(2)}`;
      if (!existingBuckets.has(bucketKey)) existingBuckets.set(bucketKey, []);
      existingBuckets.get(bucketKey)?.push({
        description: (e.description || '').toLowerCase(),
        id: e.id,
      });
    } catch {
      /* ignore */
    }
  });

  const duplicates: ImportPreviewDuplicate[] = [];
  let newCount = 0;

  for (const index of uniqueIndices) {
    const record = records[index];
    const date = parseDate(record);
    if (!date) {
      newCount++;
      continue;
    }

    const description = (record.description || '').trim();
    const creditAmount = Number(record.credit) || 0;
    const debitAmount = Number(record.debit) || 0;
    const hash = generateDedupHash(userId, {
      transactionDate: date,
      description,
      creditAmount,
      debitAmount,
      transactionId: record.transactionId,
      balance: record.balance != null ? Number(record.balance) : null,
    });

    if (existingByHash.has(hash)) {
      const match = existingByHash.get(hash)!;
      duplicates.push({
        index,
        existingId: match.id,
        date: toLocalISODate(date),
        amount: creditAmount || debitAmount,
        description,
        matchType: 'dedupHash',
      });
      continue;
    }

    if (record.transactionId && existingIds.has(record.transactionId.trim())) {
      const txnId = record.transactionId.trim();
      const match = existing.find((e) => e.transactionId === txnId);
      if (match) {
        duplicates.push({
          index,
          existingId: match.id,
          date: toLocalISODate(date),
          amount: creditAmount || debitAmount,
          description,
          matchType: 'transactionId',
        });
        continue;
      }
    }

    const bucketKey = `${toLocalISODate(date)}|${creditAmount.toFixed(2)}|${debitAmount.toFixed(2)}`;
    const bucketMatches = existingBuckets.get(bucketKey) || [];
    const fuzzy = bucketMatches.find((m) =>
      areDescriptionsSimilar(m.description, description.toLowerCase()),
    );
    if (fuzzy) {
      duplicates.push({
        index,
        existingId: fuzzy.id,
        date: toLocalISODate(date),
        amount: creditAmount || debitAmount,
        description,
        matchType: 'fuzzy',
      });
      continue;
    }

    newCount++;
  }

  let overlap: ImportPreviewResult['overlap'] = { hasOverlap: false, overlappingDays: 0 };
  if (statementPeriod.start && statementPeriod.end) {
    const start = new Date(statementPeriod.start);
    const end = new Date(statementPeriod.end);
    const overlapping = existing.filter((e) => {
      const d = new Date(e.transactionDate);
      return d >= start && d <= end;
    });
    if (overlapping.length > 0) {
      const days = new Set(overlapping.map((e) => toLocalISODate(new Date(e.transactionDate)))).size;
      overlap = {
        hasOverlap: true,
        overlappingDays: days,
        message: `${overlapping.length} existing transaction(s) overlap this statement period (${days} day(s)). Duplicates will be skipped on import.`,
      };
    }

    const accountNumber = records.find((r) => r.accountNumber)?.accountNumber;
    const bankCode = records.find((r) => r.bankCode)?.bankCode;
    if (accountNumber && bankCode) {
      const existingStatement = await (prisma as any).accountStatement.findFirst({
        where: {
          userId,
          accountNumber,
          bankCode,
          statementStartDate: { lte: end },
          statementEndDate: { gte: start },
        },
        orderBy: { importedAt: 'desc' },
      });
      if (existingStatement) {
        overlap.existingStatementId = existingStatement.id;
      }
    }
  }

  const payeeOccurrences = new Map<string, { displayName: string; entityType: 'person' | 'store'; count: number }>();
  for (const index of uniqueIndices) {
    const key = payeeKey(records[index]);
    if (!key) continue;
    const entityType = key.startsWith('store:') ? 'store' : 'person';
    const displayName = key.split(':').slice(1).join(':');
    const prev = payeeOccurrences.get(key);
    if (prev) prev.count++;
    else payeeOccurrences.set(key, { displayName, entityType, count: 1 });
  }

  const payeeCategoryHistory = new Map<string, Map<string, { id: string; name: string; count: number }>>();
  existing.forEach((e) => {
    const key = e.store
      ? `store:${e.store.toLowerCase()}`
      : e.personName
        ? `person:${e.personName.toLowerCase()}`
        : null;
    if (!key || !e.category) return;
    if (!payeeCategoryHistory.has(key)) payeeCategoryHistory.set(key, new Map());
    const map = payeeCategoryHistory.get(key)!;
    const catKey = e.category.id;
    const prev = map.get(catKey);
    if (prev) prev.count++;
    else map.set(catKey, { id: e.category.id, name: e.category.name, count: 1 });
  });

  const payees: ImportPreviewPayee[] = [];
  for (const [key, info] of payeeOccurrences) {
    const history = payeeCategoryHistory.get(key);
    if (!history || history.size === 0) {
      payees.push({
        key,
        displayName: info.displayName,
        entityType: info.entityType,
        bucket: 'new',
        occurrences: info.count,
      });
      continue;
    }

    const categories = Array.from(history.values())
      .map((c) => ({ categoryId: c.id, categoryName: c.name, count: c.count }))
      .sort((a, b) => b.count - a.count);

    if (categories.length === 1) {
      payees.push({
        key,
        displayName: info.displayName,
        entityType: info.entityType,
        bucket: 'known',
        occurrences: info.count,
        categories,
        suggestedCategoryId: categories[0].categoryId,
        suggestedCategoryName: categories[0].categoryName,
      });
    } else {
      payees.push({
        key,
        displayName: info.displayName,
        entityType: info.entityType,
        bucket: 'conflict',
        occurrences: info.count,
        categories,
        suggestedCategoryId: categories[0].categoryId,
        suggestedCategoryName: categories[0].categoryName,
      });
    }
  }

  const currentBalance = await getCurrentAccountBalance(userId);

  return {
    statementPeriod,
    overlap,
    counts: {
      new: newCount,
      duplicate: duplicates.length,
      updatable: duplicates.length,
      inFileDuplicate,
    },
    duplicates: duplicates.slice(0, 50),
    payees: payees.sort((a, b) => b.occurrences - a.occurrences).slice(0, 30),
    balance: {
      parsedClosing: enriched?.closingBalance ?? metadata?.closingBalance ?? null,
      lastStoredBalance: currentBalance.amount,
      latestImportAt: currentBalance.importedAt,
    },
  };
}
