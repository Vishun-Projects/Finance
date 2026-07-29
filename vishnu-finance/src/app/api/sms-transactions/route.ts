import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { clearUserCache } from '@/lib/api-cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { prisma } from '@/lib/db';
import { generateDedupHash, extractStableReference } from '@/lib/import-dedup';

export const dynamic = 'force-dynamic';

type SmsDraftInput = {
  smsId: string;
  description: string;
  transactionDate?: string | number;
  creditAmount?: number;
  debitAmount?: number;
  financialCategory?: string;
  transactionId?: string | null;
  personName?: string | null;
  accountNumber?: string | null;
  transferType?: string | null;
  balance?: number | null;
  notes?: string | null;
  sender?: string;
  rawBody?: string;
  receivedAt?: number;
};

function redactSmsLog(draft: SmsDraftInput) {
  return {
    smsId: draft.smsId,
    hasRef: Boolean(draft.transactionId),
    direction: Number(draft.creditAmount) > 0 ? 'credit' : 'debit',
    sender: draft.sender ? String(draft.sender).slice(0, 12) : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const drafts: SmsDraftInput[] = Array.isArray(body?.drafts)
      ? body.drafts
      : body?.draft
        ? [body.draft]
        : [];

    if (drafts.length === 0) {
      return NextResponse.json({ error: 'No drafts provided' }, { status: 400 });
    }
    if (drafts.length > 50) {
      return NextResponse.json({ error: 'Max 50 drafts per request' }, { status: 400 });
    }

    const created: Array<{ smsId: string; transactionId: string; deduped: boolean }> = [];
    const skipped: Array<{ smsId: string; reason: string }> = [];

    for (const draft of drafts) {
      if (!draft?.smsId || !draft?.description) {
        skipped.push({ smsId: draft?.smsId || 'unknown', reason: 'invalid' });
        continue;
      }

      const creditAmount = Number(draft.creditAmount) || 0;
      const debitAmount = Number(draft.debitAmount) || 0;
      if (creditAmount <= 0 && debitAmount <= 0) {
        skipped.push({ smsId: draft.smsId, reason: 'no_amount' });
        continue;
      }

      const transactionDate = new Date(
        draft.transactionDate || draft.receivedAt || Date.now(),
      );
      if (Number.isNaN(transactionDate.getTime())) {
        skipped.push({ smsId: draft.smsId, reason: 'bad_date' });
        continue;
      }

      const ref =
        (draft.transactionId && String(draft.transactionId).trim()) ||
        extractStableReference(draft.description) ||
        null;

      const dedupHash = generateDedupHash(user.id, {
        transactionDate,
        description: draft.description,
        creditAmount,
        debitAmount,
        transactionId: ref,
        balance: draft.balance != null ? Number(draft.balance) : null,
      });

      const existingByHash = await prisma.transaction.findFirst({
        where: { userId: user.id, dedupHash, isDeleted: false },
        select: { id: true },
      });

      if (existingByHash) {
        await (prisma as any).smsImportReceipt.upsert({
          where: {
            userId_smsStableId: { userId: user.id, smsStableId: draft.smsId },
          },
          create: {
            userId: user.id,
            smsStableId: draft.smsId,
            status: 'accepted_duplicate',
            transactionId: existingByHash.id,
            sender: draft.sender || null,
            receivedAt: draft.receivedAt ? new Date(draft.receivedAt) : null,
          },
          update: {
            status: 'accepted_duplicate',
            transactionId: existingByHash.id,
          },
        });
        created.push({ smsId: draft.smsId, transactionId: existingByHash.id, deduped: true });
        continue;
      }

      if (ref) {
        const existingByRef = await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            isDeleted: false,
            transactionId: ref,
          },
          select: { id: true },
        });
        if (existingByRef) {
          await (prisma as any).smsImportReceipt.upsert({
            where: {
              userId_smsStableId: { userId: user.id, smsStableId: draft.smsId },
            },
            create: {
              userId: user.id,
              smsStableId: draft.smsId,
              status: 'accepted_duplicate',
              transactionId: existingByRef.id,
              sender: draft.sender || null,
              receivedAt: draft.receivedAt ? new Date(draft.receivedAt) : null,
            },
            update: {
              status: 'accepted_duplicate',
              transactionId: existingByRef.id,
            },
          });
          created.push({ smsId: draft.smsId, transactionId: existingByRef.id, deduped: true });
          continue;
        }
      }

      const financialCategory =
        String(draft.financialCategory || (creditAmount > 0 ? 'INCOME' : 'EXPENSE')).toUpperCase();

      try {
        const tx = await prisma.transaction.create({
          data: {
            userId: user.id,
            description: draft.description,
            transactionDate,
            creditAmount,
            debitAmount,
            financialCategory: financialCategory as 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER',
            transactionId: ref,
            personName: draft.personName || null,
            accountNumber: draft.accountNumber || null,
            transferType: draft.transferType || null,
            balance: draft.balance != null ? Number(draft.balance) : null,
            notes: draft.notes || null,
            dedupHash,
            rawData: {
              source: 'sms',
              smsId: draft.smsId,
              sender: draft.sender || null,
              // Do not store full SMS body server-side by default — keep short fingerprint only
              bodyFingerprint: draft.rawBody
                ? String(draft.rawBody).slice(0, 80)
                : null,
              receivedAt: draft.receivedAt || null,
            },
            autoCategorized: false,
            isDeleted: false,
          },
          select: { id: true },
        });

        await (prisma as any).smsImportReceipt.upsert({
          where: {
            userId_smsStableId: { userId: user.id, smsStableId: draft.smsId },
          },
          create: {
            userId: user.id,
            smsStableId: draft.smsId,
            status: 'accepted',
            transactionId: tx.id,
            sender: draft.sender || null,
            receivedAt: draft.receivedAt ? new Date(draft.receivedAt) : null,
          },
          update: {
            status: 'accepted',
            transactionId: tx.id,
          },
        });

        created.push({ smsId: draft.smsId, transactionId: tx.id, deduped: false });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'create_failed';
        // Unique dedupHash race
        if (message.includes('Unique constraint') || message.includes('dedupHash')) {
          skipped.push({ smsId: draft.smsId, reason: 'duplicate_race' });
        } else {
          console.warn('[sms-transactions] create failed', redactSmsLog(draft));
          skipped.push({ smsId: draft.smsId, reason: 'create_failed' });
        }
      }
    }

    if (created.length > 0) {
      await clearUserCache(user.id);
      invalidateUserAppData(user.id);
    }

    return NextResponse.json({
      created: created.length,
      results: created,
      skipped,
    });
  } catch (error) {
    console.error('[sms-transactions] unexpected error');
    return NextResponse.json({ error: 'Failed to import SMS transactions' }, { status: 500 });
  }
}

/** Enrich empty notes on SMS-sourced txs from PDF reconcile confirmations. */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const enrichments: Array<{ transactionId: string; notes: string }> = Array.isArray(
      body?.enrichments,
    )
      ? body.enrichments
      : [];

    if (enrichments.length === 0) {
      return NextResponse.json({ error: 'No enrichments provided' }, { status: 400 });
    }

    let updated = 0;
    for (const item of enrichments.slice(0, 100)) {
      if (!item.transactionId || !item.notes?.trim()) continue;
      const existing = await prisma.transaction.findFirst({
        where: { id: item.transactionId, userId: user.id, isDeleted: false },
        select: { id: true, notes: true },
      });
      if (!existing) continue;
      if (existing.notes && existing.notes.trim().length > 0) continue;

      await prisma.transaction.update({
        where: { id: existing.id },
        data: { notes: item.notes.trim() },
      });
      updated++;
    }

    if (updated > 0) {
      await clearUserCache(user.id);
      invalidateUserAppData(user.id);
    }

    return NextResponse.json({ updated });
  } catch {
    return NextResponse.json({ error: 'Failed to enrich transactions' }, { status: 500 });
  }
}
