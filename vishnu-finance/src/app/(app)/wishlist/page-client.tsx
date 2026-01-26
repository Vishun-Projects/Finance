
'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import type { WishlistItem, WishlistResponse, WishlistPriority } from '@/types/wishlist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Gift,
  Heart,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react';

interface WishlistPageClientProps {
  initialWishlist: WishlistResponse;
  userId: string;
  layoutVariant?: 'standalone' | 'embedded';
}

interface WishlistFormState {
  title: string;
  description: string;
  estimatedCost: string;
  priority: WishlistPriority;
  category: string;
  targetDate: string;
  imageUrl: string;
  notes: string;
  tags: string;
  markCompleted: boolean;
}

type WishlistApiItem = WishlistItem & { tags?: string[] | string | null };

const PRIORITY_OPTIONS: WishlistPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_FILTERS: Array<'all' | 'completed' | 'pending'> = ['all', 'completed', 'pending'];

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
  }
  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
      }
    } catch (error) {
      console.warn('[wishlist] failed to parse tags', error);
    }
  }
  return [];
}

function formatCurrency(amount?: number): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function WishlistPageClient({ initialWishlist, userId, layoutVariant = 'standalone' }: WishlistPageClientProps) {
  const [items, setItems] = useState<WishlistItem[]>(initialWishlist.data);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | WishlistPriority>('all');
  const [sortOrder, setSortOrder] = useState<string>('priority'); // Added sortOrder state
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [formState, setFormState] = useState<WishlistFormState>({
    title: '',
    description: '',
    estimatedCost: '',
    priority: 'MEDIUM',
    category: '',
    targetDate: '',
    imageUrl: '',
    notes: '',
    tags: '',
    markCompleted: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const resetForm = useCallback(() => {
    setEditingItem(null);
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
      markCompleted: false,
    });
  }, []);

  const refreshWishlist = useCallback(async () => {
    startRefreshTransition(async () => {
      try {
        const response = await fetch(`/api/wishlist?userId=${encodeURIComponent(userId)}&page=1&pageSize=100`);
        if (!response.ok) {
          throw new Error('Failed to refresh wishlist');
        }
        const data = (await response.json()) as WishlistResponse;
        const normalised = Array.isArray(data?.data)
          ? (data.data.map((item) => {
            const apiItem = item as WishlistApiItem;
            return {
              ...apiItem,
              tags: parseTags(apiItem.tags),
            };
          }) as WishlistItem[])
          : [];
        setItems(normalised);
      } catch (error) {
        console.error('[wishlist] refresh failed', error);
      }
    });
  }, [userId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
          ? item.isCompleted
          : !item.isCompleted;

      const matchesPriority = priorityFilter === 'all' ? true : item.priority === priorityFilter;

      const matchesSearch = searchTerm
        ? item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [items, statusFilter, priorityFilter, searchTerm]);

  const stats = useMemo(() => {
    const totalCost = filteredItems.reduce((sum, item) => sum + (item.estimatedCost ?? 0), 0);
    const completed = filteredItems.filter((item) => item.isCompleted).length;
    const pending = filteredItems.length - completed;
    const priorityOrder: Record<WishlistPriority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    const nextPriority = filteredItems
      .filter((item) => !item.isCompleted)
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])[0]?.title;

    return {
      total: filteredItems.length,
      completed,
      pending,
      totalCost,
      nextPriority: nextPriority ?? null,
    } satisfies {
      total: number;
      completed: number;
      pending: number;
      totalCost: number;
      nextPriority: string | null;
    };
  }, [filteredItems]);

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: WishlistItem) => {
    setEditingItem(item);
    setFormState({
      title: item.title,
      description: item.description ?? '',
      estimatedCost: item.estimatedCost ? String(item.estimatedCost) : '',
      priority: item.priority,
      category: item.category ?? '',
      targetDate: item.targetDate ? item.targetDate.slice(0, 10) : '',
      imageUrl: item.imageUrl ?? '',
      notes: item.notes ?? '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      markCompleted: item.isCompleted,
    });
    setDialogOpen(true);
  };

  const handleFormChange = (field: keyof WishlistFormState, value: string | boolean | WishlistPriority) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formState.title || !formState.estimatedCost) {
      return;
    }

    setIsSaving(true);
    try {
      const tagsArray = formState.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        estimatedCost: parseFloat(formState.estimatedCost),
        priority: formState.priority,
        category: formState.category.trim() || null,
        targetDate: formState.targetDate ? new Date(formState.targetDate).toISOString() : null,
        imageUrl: formState.imageUrl.trim() || null,
        notes: formState.notes.trim() || null,
        tags: tagsArray,
        isCompleted: formState.markCompleted,
        completedDate: formState.markCompleted ? new Date().toISOString() : null,
        userId,
      };

      const method = editingItem ? 'PUT' : 'POST';
      if (editingItem) {
        payload.id = editingItem.id;
      }

      const response = await fetch('/api/wishlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save wishlist item');
      }

      resetForm();
      setDialogOpen(false);
      await refreshWishlist();
    } catch (error) {
      console.error('[wishlist] save failed', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    setIsDeleting(itemId);
    try {
      const response = await fetch(`/api/wishlist?id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete wishlist item');
      }
      await refreshWishlist();
    } catch (error) {
      console.error('[wishlist] delete failed', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleCompleted = async (item: WishlistItem) => {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isCompleted: !item.isCompleted,
          completedDate: !item.isCompleted ? new Date().toISOString() : null,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update wishlist item');
      }
      await refreshWishlist();
    } catch (error) {
      console.error('[wishlist] toggle complete failed', error);
    }
  };

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
            ? 'space-y-4'
            : 'container-fluid space-y-6 pb-16 pt-6 md:pt-8 lg:pt-10',
        )}
      >
        {!isEmbedded ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Wishlist</h1>
              <p className="text-muted-foreground">Capture and prioritise the purchases you care about.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={() => refreshWishlist()}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button className="gap-2" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Wishlist</h2>
              <p className="text-xs text-muted-foreground">Keep tabs on upcoming purchases and priorities.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={() => refreshWishlist()}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button size="sm" className="gap-2" onClick={openCreateDialog}>
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
        )}

        {!isEmbedded && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total items</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {stats.completed} complete • {stats.pending} pending
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Estimated cost</CardDescription>
                <CardTitle className="text-3xl">{formatCurrency(stats.totalCost)}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Based on all wishlist items
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top priority</CardDescription>
                <CardTitle className="text-3xl">{stats.nextPriority ?? '—'}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Focus on what matters most
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl">{stats.completed}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Celebrating the wins
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <TabsList className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((status) => (
                  <TabsTrigger key={status} value={status} className="capitalize">
                    {status}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                <Button
                  className={cn(
                    'h-9 rounded-md border px-3 text-sm capitalize transition-colors',
                    priorityFilter === 'all'
                      ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                  onClick={() => setPriorityFilter('all')}
                >
                  All priorities
                </Button>
                {PRIORITY_OPTIONS.map((priority) => (
                  <Button
                    key={priority}
                    className={cn(
                      'h-9 rounded-md border px-3 text-sm capitalize transition-colors',
                      priorityFilter === priority
                        ? 'bg-foreground text-background hover:bg-foreground/90'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => setPriorityFilter(priority)}
                  >
                    {priority.toLowerCase()}
                  </Button>
                ))}
              </div>
              <Select
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as typeof sortOrder)}
              >
                <SelectTrigger className="w-full sm:w-48 bg-card border-border text-foreground">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="cost-low">Cost: Low to High</SelectItem>
                  <SelectItem value="cost-high">Cost: High to Low</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search items"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full min-w-[200px] sm:w-64 bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-border"
              />
            </div>
          </div>

          <Tabs value="list">
            <TabsContent value="list" className="mt-4 space-y-4">
              {filteredItems.length === 0 ? (
                <Card className="border-dashed border-border bg-card">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {items.length === 0 ? 'Start your wishlist today.' : 'No items match your filters.'}
                  </CardContent>
                </Card>
              ) : (
                filteredItems.map((item) => {
                  const isCompleted = item.isCompleted;

                  return (
                    <Card key={item.id} className="matte-card bg-card border border-border shadow-none hover:border-foreground/20 transition-colors">
                      <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                isCompleted
                                  ? 'bg-emerald-950/30 text-emerald-500 border border-emerald-900/50'
                                  : 'bg-muted text-muted-foreground border border-border'
                              )}
                            >
                              {item.priority.toLowerCase()}
                            </span>
                            {isCompleted && (
                              <span className="inline-flex items-center rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                                Purchased
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground mb-1">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-xs text-muted-foreground font-medium">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono">
                            <span className="flex items-center gap-2">
                              <ShoppingBag className="h-3 w-3" />
                              <span className="text-foreground">{formatCurrency(item.estimatedCost)}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-stretch gap-2 sm:w-48">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="justify-between border border-border bg-muted text-muted-foreground hover:bg-border hover:text-foreground h-8 text-[10px] uppercase font-bold tracking-wider"
                            onClick={() => openEditDialog(item)}
                          >
                            <span>Edit</span>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            className={cn(
                              'justify-between h-8 text-[10px] uppercase font-bold tracking-wider',
                              isCompleted
                                ? 'border border-emerald-900/50 bg-emerald-950/20 text-emerald-500 hover:bg-emerald-900/30'
                                : 'bg-foreground text-background hover:bg-foreground/90'
                            )}
                            onClick={() => handleToggleCompleted(item)}
                          >
                            <span>{isCompleted ? 'Pending' : 'Mark purchased'}</span>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            className="justify-between bg-red-950/20 text-red-700 border border-red-900/30 hover:bg-red-950/40 hover:text-red-500 h-8 text-[10px] uppercase font-bold tracking-wider"
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting === item.id}
                          >
                            <span>{isDeleting === item.id ? 'Deleting…' : 'Delete'}</span>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}

            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Update wishlist item' : 'Add wishlist item'}</DialogTitle>
            <DialogDescription>Capture product ideas, future purchases, and dreams to plan for.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="wishlist-title">
                Title
              </label>
              <Input
                id="wishlist-title"
                placeholder="e.g. Mirrorless camera"
                value={formState.title}
                onChange={(event) => handleFormChange('title', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="wishlist-description">
                Description
              </label>
              <Textarea
                id="wishlist-description"
                rows={3}
                placeholder="Why do you want this item?"
                value={formState.description}
                onChange={(event) => handleFormChange('description', event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="wishlist-cost">
                  Estimated cost (₹)
                </label>
                <Input
                  id="wishlist-cost"
                  type="number"
                  min="0"
                  value={formState.estimatedCost}
                  onChange={(event) => handleFormChange('estimatedCost', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="wishlist-date">
                  Target date
                </label>
                <Input
                  id="wishlist-date"
                  type="date"
                  value={formState.targetDate}
                  onChange={(event) => handleFormChange('targetDate', event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Priority</label>
                <Select
                  value={formState.priority}
                  onValueChange={(value) => handleFormChange('priority', value as WishlistPriority)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority} value={priority} className="capitalize">
                        {priority.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="wishlist-category">
                  Category
                </label>
                <Input
                  id="wishlist-category"
                  placeholder="e.g. electronics, travel"
                  value={formState.category}
                  onChange={(event) => handleFormChange('category', event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="wishlist-image">
                Image URL
              </label>
              <Input
                id="wishlist-image"
                placeholder="Optional image link"
                value={formState.imageUrl}
                onChange={(event) => handleFormChange('imageUrl', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="wishlist-notes">
                Notes
              </label>
              <Textarea
                id="wishlist-notes"
                rows={2}
                placeholder="Any additional context"
                value={formState.notes}
                onChange={(event) => handleFormChange('notes', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="wishlist-tags">
                Tags
              </label>
              <Input
                id="wishlist-tags"
                placeholder="Comma-separated tags"
                value={formState.tags}
                onChange={(event) => handleFormChange('tags', event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Mark as already purchased</p>
                <p className="text-xs text-muted-foreground">Track purchases you have completed.</p>
              </div>
              <Switch
                checked={formState.markCompleted}
                onCheckedChange={(checked) => handleFormChange('markCompleted', checked)}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              className="border border-border bg-card text-foreground hover:bg-muted"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
              {editingItem ? 'Update item' : 'Add item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
