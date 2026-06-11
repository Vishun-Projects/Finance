'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import type { CategoryVariant } from '@/design/tokens';
import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';
import type { IncomeBudgetBucketDto } from '@/lib/income-budget-service';
import {
  INCOME_BUDGET_TEMPLATES,
  validateBucketPercentages,
  type IncomeBudgetTemplateId,
} from '@/lib/income-budget-templates';
import { cn } from '@/lib/utils';

interface BudgetSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

type DraftBucket = {
  key: string;
  label: string;
  percentage: number;
  variant: CategoryVariant;
  mapFrom: BreakdownCategory[];
};

const VARIANT_OPTIONS: { value: CategoryVariant; label: string }[] = [
  { value: 'needs', label: 'Needs' },
  { value: 'wants', label: 'Wants' },
  { value: 'emi', label: 'EMI / debt' },
  { value: 'invest', label: 'Investments' },
  { value: 'insurance', label: 'Insurance' },
];

function toDraft(buckets: IncomeBudgetBucketDto[]): DraftBucket[] {
  return buckets.map((b) => ({
    key: b.key,
    label: b.label,
    percentage: b.percentage,
    variant: b.variant,
    mapFrom: b.mapFrom,
  }));
}

export function BudgetSetupSheet({ open, onOpenChange, onSaved }: BudgetSetupSheetProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateId, setTemplateId] = useState<IncomeBudgetTemplateId>('50-30-20');
  const [buckets, setBuckets] = useState<DraftBucket[]>([]);
  const [error, setError] = useState<string | null>(null);

  const totalPct = useMemo(
    () => buckets.reduce((sum, b) => sum + (Number(b.percentage) || 0), 0),
    [buckets],
  );

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/income-budget');
      if (!res.ok) throw new Error('Failed to load budget');
      const data = await res.json();
      setTemplateId(data.plan.templateId);
      setBuckets(toDraft(data.plan.buckets));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadPlan();
  }, [open, loadPlan]);

  const applyTemplate = async (id: IncomeBudgetTemplateId) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/income-budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply-template', templateId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to apply template');
      }
      const data = await res.json();
      setTemplateId(data.plan.templateId);
      setBuckets(toDraft(data.plan.buckets));
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply template');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const validationError = validateBucketPercentages(
      buckets.map((b) => ({ percentage: Number(b.percentage) || 0 })),
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/income-budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'custom',
          buckets: buckets.map((b) => ({
            key: b.key,
            label: b.label,
            percentage: Number(b.percentage),
            variant: b.variant,
            mapFrom: b.mapFrom,
            sortOrder: 0,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save');
      }
      setTemplateId('custom');
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateBucket = (index: number, patch: Partial<DraftBucket>) => {
    setBuckets((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const addBucket = () => {
    setBuckets((prev) => [
      ...prev,
      {
        key: `category-${prev.length + 1}`,
        label: 'New category',
        percentage: Math.max(0, 100 - totalPct),
        variant: 'wants',
        mapFrom: ['wants'],
      },
    ]);
  };

  const removeBucket = (index: number) => {
    setBuckets((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Income budget"
      description="Split your take-home into categories. Percentages must total 100%."
    >
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Start from a template</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(INCOME_BUDGET_TEMPLATES) as IncomeBudgetTemplateId[])
                .filter((id) => id !== 'custom')
                .map((id) => {
                  const template = INCOME_BUDGET_TEMPLATES[id];
                  return (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={templateId === id ? 'default' : 'outline'}
                      disabled={saving}
                      onClick={() => void applyTemplate(id)}
                    >
                      {template.name}
                    </Button>
                  );
                })}
            </div>
            <p className="text-[10px] text-muted">
              {INCOME_BUDGET_TEMPLATES['50-30-20'].description}. Edit below or add your own categories.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-foreground">Your categories</p>
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  Math.abs(totalPct - 100) < 0.01 ? 'text-[var(--success)]' : 'text-[var(--warning)]',
                )}
              >
                Total {Math.round(totalPct * 10) / 10}%
              </span>
            </div>

            {buckets.map((bucket, index) => (
              <div key={`${bucket.key}-${index}`} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
                <div className="min-w-[8rem] flex-1">
                  <label className="mb-1 block text-[10px] text-muted">Label</label>
                  <Input
                    value={bucket.label}
                    onChange={(e) => updateBucket(index, { label: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-[10px] text-muted">%</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={bucket.percentage}
                    onChange={(e) => updateBucket(index, { percentage: Number(e.target.value) })}
                    className="h-8 text-xs tabular-nums"
                  />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-[10px] text-muted">Type</label>
                  <select
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                    value={bucket.variant}
                    onChange={(e) =>
                      updateBucket(index, { variant: e.target.value as CategoryVariant })
                    }
                  >
                    {VARIANT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted"
                  disabled={buckets.length <= 1}
                  onClick={() => removeBucket(index)}
                  aria-label="Remove category"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addBucket}>
              <Plus className="mr-1 size-3.5" />
              Add category
            </Button>
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <Button type="button" className="w-full" disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save budget'}
          </Button>
        </div>
      )}
    </ResponsiveSheet>
  );
}
