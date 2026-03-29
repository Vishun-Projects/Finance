'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Pencil,
  CheckCircle,
  Heart,
  Loader2,
  ExternalLink,
  Target,
  ShoppingBag,
  Tag,
  Circle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import FabButton from '@/components/ui/fab-button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

import { WishlistPriority, WishlistItem, WishlistResponse } from '@/types/wishlist';

interface WishlistPageClientProps {
  initialWishlist: WishlistResponse;
  userId: string;
  layoutVariant?: 'default' | 'embedded';
}

const PRIORITY_OPTIONS: WishlistPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function WishlistPageClient({ initialWishlist, userId }: WishlistPageClientProps) {
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

  return (
    <div className="space-y-4 pb-12 pt-4 md:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-foreground">Wishlist</h1>
          <p className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground opacity-70">Dreams and future purchases.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshWishlist}
            disabled={isRefreshing}
            className="h-10 border-border bg-card font-bold uppercase tracking-widest text-[10px]"
          >
            <RefreshCw className={cn('mr-2 h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            onClick={openCreateDialog}
            className="h-10 hidden sm:flex font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <FabButton
        label="Add Item"
        icon={<Plus className="h-5 w-5" />}
        onClick={openCreateDialog}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 space-y-3 px-4 sm:px-6">
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Search</label>
                <Input
                  placeholder="Macbook Pro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-muted/30 border-none h-10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-muted/30 border-none h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Purchased</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className={cn(
                "overflow-hidden border border-border shadow-sm transition-all hover:shadow-md",
                item.isCompleted ? "opacity-60 bg-muted/20" : "bg-card"
              )}>
                {item.imageUrl && (
                  <div className="aspect-video w-full overflow-hidden relative">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2">
                      <Badge variant={item.priority === 'CRITICAL' ? 'destructive' : 'secondary'} className="text-[8px] font-black uppercase tracking-widest">
                        {item.priority}
                      </Badge>
                    </div>
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className={cn("font-black text-sm uppercase tracking-tight leading-none", item.isCompleted && "line-through")}>
                      {item.title}
                    </h3>
                    {!item.imageUrl && (
                      <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">
                        {item.priority}
                      </Badge>
                    )}
                  </div>
                  {item.estimatedCost && (
                    <p className="text-lg font-black text-primary tabular-nums">
                      {formatRupees(item.estimatedCost)}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEditDialog(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={item.isCompleted ? "secondary" : "default"}
                      size="sm"
                      className="ml-auto h-8 px-3 font-black uppercase tracking-widest text-[9px]"
                      onClick={() => handleToggleCompleted(item)}
                    >
                      {item.isCompleted ? 'Pending' : 'Buy'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Sheet open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <SheetContent side="bottom" className="h-[92vh] sm:h-auto sm:max-w-xl rounded-t-[2.5rem] p-0 overflow-hidden border-t border-border/10">
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-muted/40" />
          </div>
          <div className="px-6 py-4 overflow-y-auto h-full pb-32 sm:pb-6">
            <SheetHeader className="text-left mb-6">
              <SheetTitle className="text-xl font-black uppercase tracking-widest">{editingItem ? 'Update Item' : 'Add Item'}</SheetTitle>
              <SheetDescription className="text-xs font-semibold uppercase tracking-tight opacity-70">
                Track products you want to purchase.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Title</label>
                <Input
                  placeholder="Mechanical Keyboard"
                  value={formState.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  autoFocus
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Price (₹)</label>
                  <Input
                    type="number"
                    value={formState.estimatedCost}
                    onChange={(e) => handleFormChange('estimatedCost', e.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Priority</label>
                  <Select
                    value={formState.priority}
                    onValueChange={(value) => handleFormChange('priority', value as WishlistPriority)}
                  >
                    <SelectTrigger className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Image URL</label>
                <Input
                  placeholder="https://..."
                  value={formState.imageUrl}
                  onChange={(e) => handleFormChange('imageUrl', e.target.value)}
                  className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Tags</label>
                <Input
                  placeholder="gadgets, office"
                  value={formState.tags}
                  onChange={(e) => handleFormChange('tags', e.target.value)}
                  className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Notes</label>
                <Textarea
                  placeholder="Optional details..."
                  value={formState.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-none"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-12 border-border bg-card font-bold uppercase tracking-widest text-[10px]">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving} className="h-12 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
