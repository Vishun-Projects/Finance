'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chip } from '@/components/ui/chip';
import { useToast } from '@/contexts/ToastContext';
import {
  CATEGORY_COLOR_PRESETS,
  getDefaultCategoryColorHex,
  resolveCategoryColor,
  resolvePresetToHex,
} from '@/design/tokens';
import { cn } from '@/lib/utils';
import {
  SettingsPageLayout,
  SettingsSectionHeader,
  SettingsGroup,
  SettingsFieldGroup,
} from '@/features/settings/components/settings-ui';

type UserCategory = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string | null;
  isDefault?: boolean;
};

type CategoryForm = {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
};

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: UserCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 border-t border-border px-4 py-3 first:border-t-0">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: resolveCategoryColor(category.color) }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <Chip variant="neutral" className="text-[10px]">
            {category.type === 'INCOME' ? 'Income' : 'Expense'}
          </Chip>
          {category.isDefault && (
            <Chip variant="neutral" className="text-[10px]">
              Default
            </Chip>
          )}
        </div>
      </div>
      {!category.isDefault && (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
      {category.isDefault && <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-40" />}
    </div>
  );
}

export function CategoriesSettings() {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null);
  const [formData, setFormData] = useState<CategoryForm>({
    name: '',
    type: 'EXPENSE',
    color: getDefaultCategoryColorHex(),
  });
  const { success, error: showError } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'categories_list' }),
      });
      if (response.ok) {
        const data = (await response.json()) as UserCategory[];
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Error', 'Category name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingCategory
            ? { action: 'categories_update', id: editingCategory.id, ...formData }
            : { action: 'categories_create', ...formData }
        ),
      });

      if (response.ok) {
        success('Success', editingCategory ? 'Category updated' : 'Category created');
        setShowForm(false);
        setEditingCategory(null);
        setFormData({ name: '', type: 'EXPENSE', color: getDefaultCategoryColorHex() });
        fetchCategories();
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to save category');
      }
    } catch {
      showError('Error', 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: UserCategory) => {
    if (category.isDefault) {
      showError('Error', 'Cannot delete default categories');
      return;
    }

    if (!confirm(`Delete category "${category.name}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'categories_delete', id: category.id }),
      });

      if (response.ok) {
        success('Success', 'Category deleted');
        fetchCategories();
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to delete category');
      }
    } catch {
      showError('Error', 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const openCategoryForm = (category?: UserCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color || getDefaultCategoryColorHex(),
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'EXPENSE', color: getDefaultCategoryColorHex() });
    }
    setShowForm(true);
  };

  const incomeCategories = categories.filter((c) => c.type === 'INCOME');
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  return (
    <SettingsPageLayout>
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <SettingsSectionHeader className="mb-0">Categories</SettingsSectionHeader>
          <Button size="sm" variant="outline" onClick={() => openCategoryForm()} className="btn-touch h-8">
            <Plus className="mr-1.5 size-3.5" />
            Add
          </Button>
        </div>
        <SettingsGroup>
          {loading && categories.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading categories…</p>
          ) : categories.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No categories yet. Tap Add to create one.
            </p>
          ) : (
            <>
              {incomeCategories.length > 0 && (
                <>
                  <p className="border-b border-border bg-surface/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                    Income ({incomeCategories.length})
                  </p>
                  {incomeCategories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onEdit={() => openCategoryForm(category)}
                      onDelete={() => handleDelete(category)}
                    />
                  ))}
                </>
              )}
              {expenseCategories.length > 0 && (
                <>
                  <p className="border-b border-t border-border bg-surface/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                    Expense ({expenseCategories.length})
                  </p>
                  {expenseCategories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onEdit={() => openCategoryForm(category)}
                      onDelete={() => handleDelete(category)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </SettingsGroup>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingCategory(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit category' : 'Add category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Groceries, Salary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'INCOME' | 'EXPENSE') =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="category-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_PRESETS.map((color) => {
                  const presetHex = resolvePresetToHex(color);
                  const isSelected = formData.color === presetHex;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: presetHex })}
                      className={cn(
                        'size-8 rounded-full border-2',
                        isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-full"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : editingCategory ? 'Update' : 'Create'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsPageLayout>
  );
}
