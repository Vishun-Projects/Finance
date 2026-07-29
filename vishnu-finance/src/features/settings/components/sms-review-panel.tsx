'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  listPendingSms,
  markSmsStatus,
  type PendingSmsItem,
} from '@/lib/sms-bank/pending-queue';
import { syncOverlayBubble } from '@/lib/sms-bank/sync';

type SmsReviewPanelProps = {
  onClose: () => void;
  onChanged?: () => void;
};

function formatAmount(item: PendingSmsItem): string {
  const amount = item.creditAmount || item.debitAmount;
  const sign = item.creditAmount > 0 ? '+' : '−';
  return `${sign}₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function SmsReviewPanel({ onClose, onChanged }: SmsReviewPanelProps) {
  const [items, setItems] = useState<PendingSmsItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = () => {
    setItems(listPendingSms());
  };

  useEffect(() => {
    reload();
  }, []);

  const acceptOne = async (item: PendingSmsItem) => {
    setBusyId(item.smsId);
    try {
      const res = await fetch('/api/sms-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          drafts: [
            {
              smsId: item.smsId,
              description: item.description,
              transactionDate: item.transactionDateMs || item.receivedAt,
              creditAmount: item.creditAmount,
              debitAmount: item.debitAmount,
              financialCategory: item.financialCategory,
              transactionId: item.transactionId,
              personName: item.personName,
              accountNumber: item.accountMask,
              transferType: item.transferType,
              balance: item.balance,
              notes: item.notes,
              sender: item.sender,
              receivedAt: item.receivedAt,
            },
          ],
        }),
      });

      if (!res.ok) {
        toast.error('Could not save transaction');
        return;
      }

      const data = await res.json();
      const result = data.results?.[0];
      markSmsStatus(item.smsId, 'accepted', result?.transactionId ?? null);
      await syncOverlayBubble();
      reload();
      onChanged?.();
      toast.success(result?.deduped ? 'Already in your books' : 'Transaction saved');
    } catch {
      toast.error('Network error while saving');
    } finally {
      setBusyId(null);
    }
  };

  const rejectOne = async (item: PendingSmsItem) => {
    markSmsStatus(item.smsId, 'rejected');
    await syncOverlayBubble();
    reload();
    onChanged?.();
  };

  const acceptAll = async () => {
    for (const item of listPendingSms()) {
      // Sequential to keep dedup + receipt writes simple
      // eslint-disable-next-line no-await-in-loop
      await acceptOne(item);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Review bank SMS</h2>
          <p className="text-xs text-muted-foreground">{items.length} pending confirmation</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="btn-touch" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pending.</p>
        ) : (
          items.map((item) => (
            <div key={item.smsId} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.receivedAt).toLocaleString()} · {item.sender}
                    {item.transactionId ? ` · ref ${item.transactionId}` : ''}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    item.creditAmount > 0 ? 'text-success' : 'text-foreground'
                  }`}
                >
                  {formatAmount(item)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="btn-touch flex-1"
                  disabled={busyId === item.smsId}
                  onClick={() => void acceptOne(item)}
                >
                  <Check className="mr-1.5 size-4" />
                  Yes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="btn-touch flex-1"
                  disabled={busyId === item.smsId}
                  onClick={() => void rejectOne(item)}
                >
                  <X className="mr-1.5 size-4" />
                  No
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 1 && (
        <div className="border-t border-border p-4">
          <Button type="button" className="btn-touch w-full" onClick={() => void acceptAll()}>
            Accept all ({items.length})
          </Button>
        </div>
      )}
    </div>
  );
}
