'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import type { ImportPreviewResult } from '@/lib/import-preview-service';

type Reconcile = NonNullable<ImportPreviewResult['reconcile']>;

export function SmsPdfReconcilePanel({ reconcile }: { reconcile: Reconcile }) {
  const [busy, setBusy] = useState(false);
  const enrichable = reconcile.matched.filter((m) => Boolean(m.enrichNotes));

  const applyEnrichments = async () => {
    if (enrichable.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/sms-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enrichments: enrichable.map((m) => ({
            transactionId: m.existingId,
            notes: m.enrichNotes,
          })),
        }),
      });
      if (!res.ok) {
        toast.error('Could not enrich notes');
        return;
      }
      const data = await res.json();
      toast.success(`Enriched notes on ${data.updated ?? 0} SMS import(s)`);
    } catch {
      toast.error('Network error while enriching');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">SMS ↔ PDF reconcile</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Matched by unique bank reference. Amounts are never auto-overwritten.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground">Matched refs</p>
          <p className="text-sm font-semibold">{reconcile.matched.length}</p>
        </div>
        <div className="rounded-md bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground">Notes to fill</p>
          <p className="text-sm font-semibold">{reconcile.enrichableNotes}</p>
        </div>
        <div className="rounded-md bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground">SMS-only</p>
          <p className="text-sm font-semibold">{reconcile.smsOnly.length}</p>
        </div>
      </div>

      {enrichable.length > 0 && (
        <div className="space-y-2">
          <Callout variant="info" title="Enrich empty SMS notes">
            {enrichable.length} matched SMS import(s) have empty notes that the statement can fill.
            Confirm to copy PDF notes only into empty fields.
          </Callout>
          <Button
            type="button"
            size="sm"
            className="btn-touch"
            disabled={busy}
            onClick={() => void applyEnrichments()}
          >
            Confirm notes enrich ({enrichable.length})
          </Button>
        </div>
      )}

      {reconcile.smsOnly.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <p className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium">
            In app from SMS, missing from this statement
          </p>
          <ul className="max-h-32 divide-y divide-border overflow-y-auto text-xs">
            {reconcile.smsOnly.slice(0, 8).map((row) => (
              <li key={row.existingId} className="px-3 py-2 text-muted-foreground truncate">
                {row.date} · {row.description}
                {row.transactionId ? ` · ${row.transactionId}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
