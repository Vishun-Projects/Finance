'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatRupees } from '@/lib/utils';

type SettlementType = 'LEND_RETURN' | 'BORROW_REPAY' | 'EXPENSE_REFUND' | 'OTHER';

export interface SettlementCandidate {
  id: string;
  description?: string | null;
  personName?: string | null;
  store?: string | null;
  creditAmount: number;
  debitAmount: number;
  financialCategory?: string | null;
  transactionDate?: string | Date | null;
  categoryName?: string | null;
}

interface SettlementLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTransaction: SettlementCandidate | null;
  onLinked?: () => void;
}

const SETTLEMENT_TYPES: Array<{ value: SettlementType; label: string; hint: string }> = [
  {
    value: 'LEND_RETURN',
    label: 'Lent money and got it back',
    hint: 'Outgoing payment + return credit from the same person',
  },
  {
    value: 'BORROW_REPAY',
    label: 'Borrowed and repaid',
    hint: 'Money received in + repayment sent out',
  },
  {
    value: 'EXPENSE_REFUND',
    label: 'Paid and got reimbursed',
    hint: 'Expense debit + refund credit',
  },
  {
    value: 'OTHER',
    label: 'Other linked pair',
    hint: 'Custom round-trip between two transactions',
  },
];

async function searchCandidates(source: SettlementCandidate, query: string): Promise<SettlementCandidate[]> {
  const params = new URLSearchParams({ limit: '20', excludeId: source.id });
  if (query.trim()) params.set('q', query.trim());
  const res = await fetch(`/api/transaction-settlements/candidates?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search transactions');
  const data = await res.json();
  return data.transactions ?? [];
}

export function SettlementLinkModal({
  open,
  onOpenChange,
  sourceTransaction,
  onLinked,
}: SettlementLinkModalProps) {
  const [type, setType] = useState<SettlementType>('LEND_RETURN');
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [candidates, setCandidates] = useState<SettlementCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sourceTransaction) return;
    setType(sourceTransaction.debitAmount > 0 ? 'LEND_RETURN' : 'BORROW_REPAY');
    setLabel(sourceTransaction.personName || sourceTransaction.store || '');
    setQuery('');
    setSelectedId('');
    setError(null);
  }, [open, sourceTransaction]);

  useEffect(() => {
    if (!open || !sourceTransaction) return;
    let cancelled = false;
    setLoading(true);
    void searchCandidates(sourceTransaction, query)
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sourceTransaction, query]);

  const selectedCandidate = useMemo(
    () => candidates.find((row) => row.id === selectedId) ?? null,
    [candidates, selectedId],
  );

  const submit = async () => {
    if (!sourceTransaction || !selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/transaction-settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: [sourceTransaction.id, selectedId],
          type,
          label: label.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to link transactions');
      onOpenChange(false);
      onLinked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link transactions');
    } finally {
      setSaving(false);
    }
  };

  if (!sourceTransaction) return null;

  const sourceAmount =
    sourceTransaction.debitAmount > 0 ? sourceTransaction.debitAmount : sourceTransaction.creditAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link settlement</DialogTitle>
          <DialogDescription>
            Connect two related transactions so only the net amount affects your dashboard and plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface/40 p-3 text-xs">
            <p className="font-medium text-foreground">
              {sourceTransaction.personName || sourceTransaction.store || sourceTransaction.description || 'Transaction'}
            </p>
            <p className="mt-1 text-muted-foreground">
              {sourceTransaction.transactionDate
                ? format(new Date(sourceTransaction.transactionDate), 'd MMM yyyy')
                : 'Unknown date'}
              {' · '}
              {formatRupees(sourceAmount)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlement-type">Settlement type</Label>
            <Select value={type} onValueChange={(value) => setType(value as SettlementType)}>
              <SelectTrigger id="settlement-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SETTLEMENT_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {SETTLEMENT_TYPES.find((option) => option.value === type)?.hint}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlement-label">Label (optional)</Label>
            <Input
              id="settlement-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Loan to Vinod"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="counterpart-search">Matching transaction</Label>
            <Input
              id="counterpart-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, amount, description"
            />
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? 'Searching…' : 'Pick the return / repayment'} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {candidates.map((candidate) => {
                  const amount = candidate.debitAmount > 0 ? candidate.debitAmount : candidate.creditAmount;
                  const name =
                    candidate.personName || candidate.store || candidate.description || 'Transaction';
                  return (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {name} · {formatRupees(amount)}
                      {candidate.transactionDate
                        ? ` · ${format(new Date(candidate.transactionDate), 'd MMM')}`
                        : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedCandidate && (
              <p className="text-[11px] text-muted-foreground">
                Selected: {formatRupees(
                  selectedCandidate.debitAmount > 0
                    ? selectedCandidate.debitAmount
                    : selectedCandidate.creditAmount,
                )}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!selectedId || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                <Link2 className="mr-2 size-4" />
                Link transactions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
