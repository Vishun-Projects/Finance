'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import type { NetWorthBreakdown } from '@/lib/net-worth-service';
import { DebtPayoffHint } from '@/features/net-worth/components/debt-payoff-hint';

const ASSET_TYPES = ['BANK', 'INVESTMENT', 'PROPERTY', 'VEHICLE', 'GOLD', 'OTHER'] as const;
const LIABILITY_TYPES = ['LOAN', 'CREDIT_CARD', 'MORTGAGE', 'OTHER'] as const;

export function NetWorthSection({ initialData }: { initialData?: NetWorthBreakdown | null }) {
  const { formatCurrency } = useCurrency();
  const { success, error: showError } = useToast();
  const [data, setData] = useState<NetWorthBreakdown | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData == null);
  const [assetName, setAssetName] = useState('');
  const [assetAmount, setAssetAmount] = useState('');
  const [assetType, setAssetType] = useState<string>('OTHER');
  const [liabilityName, setLiabilityName] = useState('');
  const [liabilityAmount, setLiabilityAmount] = useState('');
  const [liabilityType, setLiabilityType] = useState<string>('OTHER');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/net-worth');
      if (!res.ok) throw new Error('Failed to load net worth');
      setData(await res.json());
    } catch (e) {
      showError('Net worth', e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (initialData != null) return;
    void load();
  }, [initialData, load]);

  const addEntry = async (kind: 'asset' | 'liability') => {
    const name = kind === 'asset' ? assetName : liabilityName;
    const amount = Number(kind === 'asset' ? assetAmount : liabilityAmount);
    if (!name.trim() || !Number.isFinite(amount) || amount < 0) {
      showError('Validation', 'Enter a name and valid amount');
      return;
    }
    const res = await fetch('/api/net-worth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        name: name.trim(),
        type: kind === 'asset' ? assetType : liabilityType,
        amount,
      }),
    });
    if (!res.ok) {
      showError('Net worth', 'Could not save entry');
      return;
    }
    success('Saved', `${kind === 'asset' ? 'Asset' : 'Liability'} added`);
    if (kind === 'asset') {
      setAssetName('');
      setAssetAmount('');
    } else {
      setLiabilityName('');
      setLiabilityAmount('');
    }
    void load();
  };

  const removeEntry = async (id: string, kind: 'asset' | 'liability') => {
    const res = await fetch(`/api/net-worth?id=${id}&kind=${kind}`, { method: 'DELETE' });
    if (!res.ok) {
      showError('Net worth', 'Could not delete entry');
      return;
    }
    void load();
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data && (
        <div className="card-base border-primary/20 p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Net worth</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrency(data.netWorth)}</p>
          <p className="mt-2 text-xs text-muted">
            Assets {formatCurrency(data.totalAssets)} − Liabilities {formatCurrency(data.totalLiabilities)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Includes {formatCurrency(data.bankBalance)} from your latest bank statement —{' '}
            <Link href="/transactions" className="font-medium text-foreground underline-offset-2 hover:underline">
              view on Transactions
            </Link>
            . Manual assets: {formatCurrency(data.manualAssets)}.
          </p>
        </div>
      )}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingUp className="size-3.5" /> Assets
              </CardDescription>
              <CardTitle className="text-xl tabular-nums">{formatCurrency(data.totalAssets)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">
              Manual entries + bank from statements
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingDown className="size-3.5" /> Liabilities
              </CardDescription>
              <CardTitle className="text-xl tabular-nums">{formatCurrency(data.totalLiabilities)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add asset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="asset-name">Name</Label>
              <Input id="asset-name" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="PPF, FD, property…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="asset-amount">Value (₹)</Label>
                <Input id="asset-amount" type="number" min={0} value={assetAmount} onChange={(e) => setAssetAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={() => void addEntry('asset')}>
              <Plus className="mr-1 size-3.5" /> Add asset
            </Button>
            <ul className="space-y-2 pt-2">
              {data?.assets.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{a.name} <span className="text-muted-foreground">({a.type})</span></span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">{formatCurrency(a.value)}</span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => void removeEntry(a.id, 'asset')}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="liability-name">Name</Label>
              <Input id="liability-name" value={liabilityName} onChange={(e) => setLiabilityName(e.target.value)} placeholder="Home loan, credit card…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="liability-amount">Balance (₹)</Label>
                <Input id="liability-amount" type="number" min={0} value={liabilityAmount} onChange={(e) => setLiabilityAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={liabilityType} onValueChange={setLiabilityType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LIABILITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={() => void addEntry('liability')}>
              <Plus className="mr-1 size-3.5" /> Add liability
            </Button>
            <ul className="space-y-2 pt-2">
              {data?.liabilities.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{l.name} <span className="text-muted-foreground">({l.type})</span></span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">{formatCurrency(l.balance)}</span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => void removeEntry(l.id, 'liability')}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {data && data.liabilities.length > 0 && (
        <DebtPayoffHint
          liabilities={data.liabilities.map((l) => ({
            id: l.id,
            name: l.name,
            balance: l.balance,
          }))}
        />
      )}
    </div>
  );
}
