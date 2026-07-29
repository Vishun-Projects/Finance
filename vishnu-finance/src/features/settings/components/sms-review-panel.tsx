'use client';

import { useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

type CategoryOption = { id: string; name: string; type: string };

type SuggestResult = {
  smsId?: string | null;
  bucket: 'known' | 'new' | 'conflict';
  displayName: string | null;
  canonicalName: string | null;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  categories: Array<{ categoryId: string; categoryName: string; count: number }>;
};

type EditDraft = {
  creditAmount: number;
  debitAmount: number;
  personName: string;
  store: string;
  financialCategory: 'INCOME' | 'EXPENSE';
  categoryId: string;
  notes: string;
};

function formatAmount(credit: number, debit: number): string {
  const amount = credit || debit;
  const sign = credit > 0 ? '+' : '−';
  return `${sign}₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

async function hapticSuccess() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: 'success' as never });
  } catch {
    /* ignore */
  }
}

async function hapticLight() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

export function SmsReviewPanel({ onClose, onChanged }: SmsReviewPanelProps) {
  const [items, setItems] = useState<PendingSmsItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, SuggestResult>>({});
  const [edit, setEdit] = useState<EditDraft | null>(null);

  const current = items[0] ?? null;
  const suggest = current ? suggestions[current.smsId] : undefined;
  const remaining = items.length;

  const reload = () => {
    const pending = listPendingSms();
    setItems(pending);
    setFixing(false);
    setEdit(null);
    return pending;
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/categories', { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as CategoryOption[];
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/sms-transactions/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            drafts: items.map((item) => ({
              smsId: item.smsId,
              personName: item.personName,
              store: null,
              description: item.description,
            })),
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const map: Record<string, SuggestResult> = {};
        for (const s of data.suggestions ?? []) {
          if (s?.smsId) map[s.smsId] = s;
        }
        if (!cancelled) setSuggestions(map);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const resolvedCategoryId = (item: PendingSmsItem, draft?: EditDraft | null) => {
    if (draft?.categoryId) return draft.categoryId;
    return suggestions[item.smsId]?.suggestedCategoryId || '';
  };

  const saveItem = async (item: PendingSmsItem, draft?: EditDraft | null) => {
    setBusy(true);
    try {
      const creditAmount = draft ? draft.creditAmount : item.creditAmount;
      const debitAmount = draft ? draft.debitAmount : item.debitAmount;
      const personName = draft ? draft.personName.trim() || null : item.personName || null;
      const store = draft ? draft.store.trim() || null : null;
      const financialCategory = draft
        ? draft.financialCategory
        : item.financialCategory;
      const categoryId = resolvedCategoryId(item, draft) || null;
      const notes = draft ? draft.notes.trim() || null : item.notes || null;
      const canonical = suggestions[item.smsId]?.canonicalName;

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
              creditAmount,
              debitAmount,
              financialCategory,
              categoryId,
              transactionId: item.transactionId,
              personName: canonical && !draft ? canonical : personName,
              store,
              accountNumber: item.accountMask,
              transferType: item.transferType,
              balance: item.balance,
              notes,
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
      await hapticSuccess();
      const next = reload();
      onChanged?.();
      toast.success(result?.deduped ? 'Already in your books' : 'Logged');
      if (next.length === 0) onClose();
    } catch {
      toast.error('Network error while saving');
    } finally {
      setBusy(false);
    }
  };

  const discardItem = async (item: PendingSmsItem) => {
    markSmsStatus(item.smsId, 'rejected');
    await syncOverlayBubble();
    await hapticLight();
    const next = reload();
    onChanged?.();
    toast.message('Discarded');
    if (next.length === 0) onClose();
  };

  const startFix = (item: PendingSmsItem) => {
    setFixing(true);
    setEdit({
      creditAmount: item.creditAmount,
      debitAmount: item.debitAmount,
      personName: suggestions[item.smsId]?.canonicalName || item.personName || '',
      store: '',
      financialCategory: item.financialCategory,
      categoryId: suggestions[item.smsId]?.suggestedCategoryId || '',
      notes: item.notes || '',
    });
  };

  const filteredCategories = categories.filter((c) => {
    if (!edit) return true;
    return c.type === edit.financialCategory || c.type === 'OTHER';
  });

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background/92 backdrop-blur-lg">
      <div className="flex items-center justify-between border-b border-border/70 bg-background/85 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Review bank alert</h2>
          <p className="text-xs text-muted-foreground">
            {remaining === 0
              ? 'Nothing pending'
              : `${remaining} left · confirm before saving`}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="btn-touch" onClick={onClose}>
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!current ? (
          <p className="text-sm text-muted-foreground">All caught up.</p>
        ) : (
          <div className="mx-auto w-full max-w-md space-y-4">
            <div className="rounded-2xl border border-border/80 bg-background/88 p-4 shadow-lg space-y-3">
              <p className="text-sm font-medium text-foreground">Is this entry correct to log?</p>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">
                    {suggest?.canonicalName || current.personName || current.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(current.transactionDateMs || current.receivedAt).toLocaleString()}
                    {current.transactionId ? ` · ref ${current.transactionId}` : ''}
                  </p>
                  {current.personName && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">{current.description}</p>
                  )}
                </div>
                <p
                  className={`shrink-0 text-lg font-semibold tabular-nums ${
                    current.creditAmount > 0 ? 'text-success' : 'text-foreground'
                  }`}
                >
                  {formatAmount(current.creditAmount, current.debitAmount)}
                </p>
              </div>

              {!fixing && (
                <div className="rounded-lg border border-border/60 bg-background/92 px-3 py-2 text-sm">
                  {suggest?.bucket === 'known' && suggest.suggestedCategoryName ? (
                    <p className="text-muted-foreground">
                      Will use <span className="font-medium text-foreground">{suggest.suggestedCategoryName}</span>
                    </p>
                  ) : suggest?.bucket === 'conflict' ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">Pick a category</p>
                      <Select
                        value={suggest.suggestedCategoryId || ''}
                        onValueChange={(value) => {
                          setSuggestions((prev) => ({
                            ...prev,
                            [current.smsId]: {
                              ...suggest,
                              suggestedCategoryId: value,
                              suggestedCategoryName:
                                suggest.categories.find((c) => c.categoryId === value)?.categoryName
                                || categories.find((c) => c.id === value)?.name
                                || null,
                            },
                          }));
                        }}
                      >
                        <SelectTrigger className="h-10 bg-background">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 bg-background/98">
                          {(suggest.categories.length
                            ? suggest.categories.map((c) => ({
                                id: c.categoryId,
                                name: `${c.categoryName} (${c.count})`,
                              }))
                            : categories.map((c) => ({ id: c.id, name: c.name }))
                          ).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">Pick a category</p>
                      <Select
                        value={suggest?.suggestedCategoryId || ''}
                        onValueChange={(value) => {
                          const name = categories.find((c) => c.id === value)?.name || null;
                          setSuggestions((prev) => ({
                            ...prev,
                            [current.smsId]: {
                              ...(prev[current.smsId] || {
                                bucket: 'new' as const,
                                displayName: current.personName || null,
                                canonicalName: current.personName || null,
                                categories: [],
                                smsId: current.smsId,
                              }),
                              suggestedCategoryId: value,
                              suggestedCategoryName: name,
                            },
                          }));
                        }}
                      >
                        <SelectTrigger className="h-10 bg-background">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 bg-background/98">
                          {categories
                            .filter(
                              (c) =>
                                c.type === current.financialCategory || c.type === 'OTHER',
                            )
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {fixing && edit && (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Debit ₹</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="mt-1"
                        value={edit.debitAmount || ''}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            debitAmount: Number(e.target.value) || 0,
                            creditAmount: 0,
                            financialCategory: 'EXPENSE',
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Credit ₹</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="mt-1"
                        value={edit.creditAmount || ''}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            creditAmount: Number(e.target.value) || 0,
                            debitAmount: 0,
                            financialCategory: 'INCOME',
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Person</label>
                    <Input
                      className="mt-1"
                      value={edit.personName}
                      onChange={(e) => setEdit({ ...edit, personName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Store</label>
                    <Input
                      className="mt-1"
                      value={edit.store}
                      onChange={(e) => setEdit({ ...edit, store: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <Select
                      value={edit.financialCategory}
                      onValueChange={(value: 'INCOME' | 'EXPENSE') =>
                        setEdit({ ...edit, financialCategory: value, categoryId: '' })
                      }
                    >
                      <SelectTrigger className="mt-1 h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 bg-background/98">
                        <SelectItem value="EXPENSE">Expense</SelectItem>
                        <SelectItem value="INCOME">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Category</label>
                    <Select
                      value={edit.categoryId}
                      onValueChange={(value) => setEdit({ ...edit, categoryId: value })}
                    >
                      <SelectTrigger className="mt-1 h-10 bg-background">
                        <SelectValue placeholder="Choose category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 bg-background/98">
                        {filteredCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Notes</label>
                    <Input
                      className="mt-1"
                      value={edit.notes}
                      onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {!fixing ? (
              <div className="space-y-2 rounded-xl border border-border/60 bg-background/90 p-2.5 shadow-sm">
                <Button
                  type="button"
                  size="lg"
                  className="btn-touch h-12 w-full text-base"
                  disabled={busy}
                  onClick={() => void saveItem(current)}
                >
                  <Check className="mr-2 size-5" />
                  Yes, log it
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn-touch"
                    disabled={busy}
                    onClick={() => startFix(current)}
                  >
                    <Pencil className="mr-1.5 size-4" />
                    No, fix it
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="btn-touch text-muted-foreground"
                    disabled={busy}
                    onClick={() => void discardItem(current)}
                  >
                    <Trash2 className="mr-1.5 size-4" />
                    Discard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-border/60 bg-background/90 p-2.5 shadow-sm">
                <Button
                  type="button"
                  size="lg"
                  className="btn-touch h-12 w-full text-base"
                  disabled={busy || (!edit?.creditAmount && !edit?.debitAmount)}
                  onClick={() => void saveItem(current, edit)}
                >
                  <Check className="mr-2 size-5" />
                  Save corrected
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="btn-touch w-full"
                  disabled={busy}
                  onClick={() => {
                    setFixing(false);
                    setEdit(null);
                  }}
                >
                  Cancel fix
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
