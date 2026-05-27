'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Pencil,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import FabButton from '@/components/ui/fab-button';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';

import { WishlistPriority, WishlistItem, WishlistResponse } from '@/features/plans/types';

interface WishlistPageClientProps {
  initialWishlist: WishlistResponse;
  userId: string;
  layoutVariant?: 'standalone' | 'embedded';
}

const PRIORITY_OPTIONS: WishlistPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function WishlistPageClient({ initialWishlist, userId, layoutVariant = 'standalone' }: WishlistPageClientProps) {
  const [items, setItems] = useState<WishlistItem[]>(initialWishlist.data || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { formatCurrency: formatRupees } = useCurrency();
  const { success: showToast, error: showErrorToast } = useToast();

  const [formState, setFormState] = useState({
    title: '',
    description: '',
    estimatedCost: '',
    priority: 'MEDIUM' as WishlistPriority,
    category: '',
    targetDate: '',
    imageUrl: '',
    notes: '',
    tags: '',
    isCompleted: false,
  });

  const refreshWishlist = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/wishlist');
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Error refreshing wishlist:', error);
      showErrorToast('Failed to refresh wishlist');
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  const resetForm = () => {
    setFormState({
      title: '',
      description: '',
      estimatedCost: '',
      priority: 'MEDIUM',
      category: '',
      targetDate: '',
      imageUrl: '',
      notes: '',
      tags: '',
      isCompleted: false,
    });
    setEditingItem(null);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: WishlistItem) => {
    setEditingItem(item);
    setFormState({
      title: item.title,
      description: item.description || '',
      estimatedCost: item.estimatedCost ? String(item.estimatedCost) : '',
      priority: item.priority,
      category: item.category || '',
      targetDate: item.targetDate ? item.targetDate.split('T')[0] : '',
      imageUrl: item.imageUrl || '',
      notes: item.notes || '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      isCompleted: item.isCompleted,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formState.title) {
      showErrorToast('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      const tagsArray = formState.tags
        ? formState.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];

      const payload = {
        ...formState,
        estimatedCost: formState.estimatedCost ? parseFloat(formState.estimatedCost) : null,
        tags: tagsArray,
      };

      const url = editingItem ? `/api/wishlist/${editingItem.id}` : '/api/wishlist';
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast(editingItem ? 'Item updated' : 'Item added');
        setDialogOpen(false);
        refreshWishlist();
      } else {
        showErrorToast('Failed to save item');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      showErrorToast('Error saving item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    setIsDeleting(id);
    try {
      const response = await fetch(`/api/wishlist/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Item deleted', 'success');
        refreshWishlist();
      }
    } catch (error) {
      showErrorToast('Error deleting item');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleCompleted = async (item: WishlistItem) => {
    try {
      const response = await fetch(`/api/wishlist/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isCompleted: !item.isCompleted }),
      });
      if (response.ok) {
        refreshWishlist();
      }
    } catch (error) {
      showErrorToast('Error updating status');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
          ? item.isCompleted
          : !item.isCompleted;

      const matchesPriority = priorityFilter === 'all'
        ? true
        : item.priority === priorityFilter;

      const matchesSearch = searchTerm
        ? item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [items, statusFilter, priorityFilter, searchTerm]);

  const wishlistStats = useMemo(() => ({
    pending: items.filter((item) => !item.isCompleted).length,
    completed: items.filter((item) => item.isCompleted).length,
    totalCost: items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0),
    highPriority: items.filter((item) => item.priority === 'HIGH' || item.priority === 'CRITICAL').length,
  }), [items]);

  const isEmbedded = layoutVariant === 'embedded';

  return (
    <div
      className={cn(
        'w-full',
        !isEmbedded && 'min-h-screen bg-background',
        isEmbedded && 'space-y-4'
      )}
    >
      <div
        className={cn(
          isEmbedded
            ? 'space-y-3'
            : 'container-fluid space-y-4 pb-12 pt-4 md:pt-6 lg:pt-8',
        )}
      >
        {!isEmbedded ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Wishlist</h1>
              <p className="text-muted-foreground">Track things you want to buy and plan for them.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={refreshWishlist}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button className="hidden gap-2 sm:flex" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Wishlist</h2>
              <p className="text-xs text-muted-foreground">Dream purchases and future buys.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={refreshWishlist}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button size="sm" className="hidden gap-2 sm:flex" onClick={openCreateDialog}>
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
        )}

        <FabButton
          label="Add item"
          icon={<Plus className="h-5 w-5" />}
          onClick={openCreateDialog}
          className="bg-primary text-primary-foreground"
        />

        {!isEmbedded ? (
          <section className={cn(patterns.cardGrid, 'lg:grid-cols-4')}>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Pending</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{wishlistStats.pending}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Completed</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{wishlistStats.completed}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Estimated total</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{formatRupees(wishlistStats.totalCost)}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">High priority</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{wishlistStats.highPriority}</p>
            </div>
          </section>
        ) : null}

        <section className="card-base overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {(['all', 'pending', 'completed'] as const).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 capitalize"
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Search wishlist…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full max-w-xs"
            />
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-[11px] font-medium uppercase tracking-[0.08em] text-hint">
                  <th className="w-10 px-4 py-3">#</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3 text-right">Est. cost</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className={cn('hover:bg-surface/80', item.isCompleted && 'opacity-60')}>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className={cn('font-medium text-foreground', item.isCompleted && 'line-through')}>{item.title}</p>
                      {item.category ? (
                        <p className="text-xs capitalize text-muted">{item.category}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{item.priority.toLowerCase()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.tags?.slice(0, 3).map((tag, tagIdx) => (
                          <Badge key={tagIdx} variant="secondary" className="text-[10px] font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums numeric">{formatRupees(item.estimatedCost || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(item)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn('size-8', item.isCompleted && 'text-[var(--success)]')}
                          onClick={() => handleToggleCompleted(item)}
                        >
                          <ShoppingBag className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[var(--danger)]"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                      No wishlist items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {filteredItems.map((item) => (
              <div key={item.id} className={cn('space-y-3 px-4 py-4', item.isCompleted && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn('font-medium text-foreground', item.isCompleted && 'line-through')}>{item.title}</p>
                    {item.category ? (
                      <p className="text-xs capitalize text-muted">{item.category}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">{item.priority.toLowerCase()}</Badge>
                </div>
                {item.tags && item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag, tagIdx) => (
                      <Badge key={tagIdx} variant="secondary" className="text-[10px] font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <p className="text-sm tabular-nums text-foreground">{formatRupees(item.estimatedCost || 0)}</p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => openEditDialog(item)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => handleToggleCompleted(item)}>
                    {item.isCompleted ? 'Undo' : 'Purchased'}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-[var(--danger)]" onClick={() => handleDelete(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted">No wishlist items found.</p>
            )}
          </div>
        </section>
      </div>

      <ResponsiveSheet
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
        title={editingItem ? 'Update item' : 'Add item'}
        description="Track products you want to purchase."
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {editingItem ? 'Update item' : 'Add item'}
            </Button>
          </div>
        }
      >
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Title</label>
                <Input
                  placeholder="Mechanical keyboard"
                  value={formState.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Price (₹)</label>
                  <Input
                    type="number"
                    value={formState.estimatedCost}
                    onChange={(e) => handleFormChange('estimatedCost', e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <Select
                    value={formState.priority}
                    onValueChange={(value) => handleFormChange('priority', value as WishlistPriority)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">{p.toLowerCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Image URL</label>
                <Input
                  placeholder="https://..."
                  value={formState.imageUrl}
                  onChange={(e) => handleFormChange('imageUrl', e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tags</label>
                <Input
                  placeholder="gadgets, office"
                  value={formState.tags}
                  onChange={(e) => handleFormChange('tags', e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <Textarea
                  placeholder="Optional details…"
                  value={formState.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="resize-none"
                />
              </div>

            </div>
      </ResponsiveSheet>
    </div>
  );
}
