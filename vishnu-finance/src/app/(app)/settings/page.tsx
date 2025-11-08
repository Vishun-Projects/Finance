'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrency } from '../../../contexts/CurrencyContext';
import { useToast } from '../../../contexts/ToastContext';
import { useNotifications } from '../../../lib/notifications';
import { 
  Bell, 
  Shield, 
  Save,
  CheckCircle,
  Palette,
  Moon,
  Sun,
  Contrast,
  Globe,
  Mail,
  Smartphone,
  Lock,
  Key,
  Trash2,
  Download,
  Upload,
  FileText,
  Tag,
  Plus,
  Edit,
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatFileSize, validateDeleteMode } from '@/lib/document-utils';

// Document Management Component
type UserDocument = {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  isDeleted: boolean;
  visibility: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
  sourceType: 'USER_UPLOAD' | 'BANK_STATEMENT' | 'PORTAL_RESOURCE' | 'SYSTEM';
  ownerId?: string | null;
  uploadedById: string;
  bankCode?: string | null;
  transactionCount: number;
};

function DocumentManagement() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [includePortal, setIncludePortal] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'portal'>('all');
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    document: UserDocument | null;
    mode: 'document-only' | 'document-and-transactions';
    submitting: boolean;
  }>({ open: false, document: null, mode: 'document-only', submitting: false });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/user/documents?includePortal=${includePortal}`);
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      showError('Error', 'Unable to load documents right now');
    } finally {
      setLoading(false);
    }
  }, [includePortal, showError]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    if (!user) return documents;
    switch (filter) {
      case 'mine':
        return documents.filter(doc => doc.ownerId === user.id || doc.uploadedById === user.id);
      case 'portal':
        return documents.filter(doc => doc.visibility !== 'PRIVATE' && doc.ownerId !== user.id);
      default:
        return documents;
    }
  }, [documents, filter, user]);

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/user/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setDocuments(prev => [data.document, ...prev]);
      success('Uploaded', `${file.name} added to your documents`);
    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload failed', 'Could not upload the document. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openDeleteDialog = (document: UserDocument) => {
    setDeleteState({
      open: true,
      document,
      mode: 'document-only',
      submitting: false,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteState(prev => ({ ...prev, open: false, document: null, submitting: false }));
  };

  const confirmDelete = async () => {
    if (!deleteState.document) return;
    setDeleteState(prev => ({ ...prev, submitting: true }));
    try {
      const response = await fetch(`/api/user/documents/${deleteState.document.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: deleteState.mode }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== deleteState.document?.id));
      const message =
        deleteState.mode === 'document-and-transactions'
          ? 'Document and linked transactions deleted.'
          : 'Document deleted. Transactions will remain.';
      success('Deleted', message);
      closeDeleteDialog();
    } catch (error) {
      console.error('Delete error:', error);
      showError('Delete failed', 'Could not delete the document.');
      setDeleteState(prev => ({ ...prev, submitting: false }));
    }
  };

  return (
      <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Your Documents</span>
              </CardTitle>
              <CardDescription>
            Manage statements and personal uploads. Download originals or remove them when no longer needed.
              </CardDescription>
            </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDocuments} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
            </Button>
          <Button size="sm" onClick={handleFilePick} disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload PDF'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelected}
          />
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Label className="flex items-center gap-1 text-xs">
              <Switch
                checked={includePortal}
                onCheckedChange={value => setIncludePortal(value)}
              />
              Include portal documents
            </Label>
              </div>
          <div className="flex items-center gap-2">
            {(['all', 'mine', 'portal'] as const).map(option => (
              <Button
                key={option}
                variant={filter === option ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(option)}
              >
                {option === 'all' && 'All'}
                {option === 'mine' && 'My Uploads'}
                {option === 'portal' && 'Portal'}
              </Button>
            ))}
            </div>
              </div>

        {loading ? (
          <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">
            Loading documents...
            </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">
            No documents found. Upload a PDF or import a statement to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map(doc => {
              const canDelete =
                user &&
                (doc.ownerId === user.id || doc.uploadedById === user.id) &&
                doc.visibility === 'PRIVATE';

              return (
                <Card key={doc.id} className="border border-border/70">
                  <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{doc.originalName}</h3>
                        <Badge variant={doc.sourceType === 'USER_UPLOAD' ? 'default' : 'secondary'}>
                          {doc.sourceType.replace('_', ' ')}
                        </Badge>
                        {doc.visibility !== 'PRIVATE' && (
                          <Badge variant="outline">{doc.visibility.toLowerCase()}</Badge>
                      )}
                    </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                        <span>{new Date(doc.createdAt).toLocaleString()}</span>
                        <Separator orientation="vertical" />
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <Separator orientation="vertical" />
                        <span>{doc.transactionCount} linked transaction{doc.transactionCount === 1 ? '' : 's'}</span>
                        {doc.bankCode && (
                          <>
                            <Separator orientation="vertical" />
                            <span>Bank: {doc.bankCode}</span>
                          </>
                        )}
                  </div>
                </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/api/user/documents/${doc.id}/download`} target="_blank">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Link>
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(doc)}
                        >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                      )}
            </div>
          </CardContent>
        </Card>
              );
            })}
          </div>
        )}

        <Dialog open={deleteState.open} onOpenChange={open => !open && closeDeleteDialog()}>
          <DialogContent className="sm:max-w-md">
          <DialogHeader>
              <DialogTitle>Remove document</DialogTitle>
            <DialogDescription>
                Choose whether to remove just the document or delete the linked transactions as well.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/60 text-sm">
                <p className="font-medium">{deleteState.document?.originalName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {deleteState.document?.transactionCount || 0} transaction(s) linked.
                </p>
            </div>
            <div className="space-y-2">
                <Label>Delete Options</Label>
                <div className="grid gap-2">
                  {(['document-only', 'document-and-transactions'] as const).map(option => (
                    <Button
                      key={option}
                      variant={deleteState.mode === option ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setDeleteState(prev => ({ ...prev, mode: validateDeleteMode(option) }))
                      }
                    >
                      {option === 'document-only'
                        ? 'Keep transactions, delete document'
                        : 'Delete document and linked transactions'}
                    </Button>
                  ))}
              </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={closeDeleteDialog} disabled={deleteState.submitting}>
              Cancel
            </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteState.submitting}
              >
                {deleteState.submitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </CardContent>
    </Card>
  );
}

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

// Category Management Component
function CategoryManagement() {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null);
  const [formData, setFormData] = useState<CategoryForm>({ name: '', type: 'EXPENSE', color: '#3B82F6' });
  const { success, error: showError } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/categories');
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
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        success('Success', editingCategory ? 'Category updated' : 'Category created');
        setShowForm(false);
        setEditingCategory(null);
        setFormData({ name: '', type: 'EXPENSE', color: '#3B82F6' });
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
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
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

  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const colorPresets = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#F43F5E', '#DC2626', '#7C2D12', '#059669', '#6B7280'
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="w-5 h-5" />
                <span>Transaction Categories</span>
              </CardTitle>
              <CardDescription>
                Manage your income and expense categories. Default categories cannot be modified or deleted.
              </CardDescription>
            </div>
            <Button onClick={() => { setShowForm(true); setEditingCategory(null); setFormData({ name: '', type: 'EXPENSE', color: '#3B82F6' }); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Income Categories */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-lg">Income Categories</h3>
              <Badge variant="secondary">{incomeCategories.length}</Badge>
            </div>
            {loading && incomeCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : incomeCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No income categories</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {incomeCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color ?? '#3B82F6' }} />
                      <span className="font-medium">{category.name}</span>
                      {category.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                    </div>
                    {!category.isDefault && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategory(category); setFormData({ name: category.name, type: category.type, color: category.color || '#3B82F6' }); setShowForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(category)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Expense Categories */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-lg">Expense Categories</h3>
              <Badge variant="secondary">{expenseCategories.length}</Badge>
            </div>
            {loading && expenseCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : expenseCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No expense categories</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {expenseCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color ?? '#3B82F6' }} />
                      <span className="font-medium">{category.name}</span>
                      {category.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                    </div>
                    {!category.isDefault && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategory(category); setFormData({ name: category.name, type: category.type, color: category.color || '#3B82F6' }); setShowForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(category)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Category Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowForm(false); setEditingCategory(null); }}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingCategory(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Groceries, Salary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value: 'INCOME' | 'EXPENSE') => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
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
                <div className="flex gap-2 flex-wrap">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-primary ring-2 ring-primary' : 'border-border'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingCategory(null); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [loading, setLoading] = useState(false);
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { selectedCurrency, setSelectedCurrency, lastUpdated } = useCurrency();
  const { success, error: showError } = useToast();
  const { requestPermission, isSupported, permission } = useNotifications();

  // Additional settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    marketing: false
  });
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'private',
    dataSharing: false,
    analytics: true
  });
  const [preferences, setPreferences] = useState({
    language: 'en',
    currency: selectedCurrency,
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata'
  });
  

  const handleSave = async (section: string) => {
    if (!user?.id) {
      console.error('No user ID available');
      showError('Error', 'No user ID available');
      return;
    }

    setLoading(true);
    try {
      console.log('Saving preferences:', {
        userId: user.id,
        navigationLayout: 'top',
        theme: theme,
        colorScheme: 'default',
        currency: selectedCurrency,
        language: preferences.language,
        timezone: preferences.timezone,
        dateFormat: preferences.dateFormat
      });

      // Save to database
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          navigationLayout: 'top', // Fixed to top navbar
          theme: theme,
          colorScheme: 'default',
          currency: selectedCurrency,
          language: preferences.language,
          timezone: preferences.timezone,
          dateFormat: preferences.dateFormat
        })
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        // Show success message
        success('Settings Saved', `${section} settings have been saved successfully!`);
        setSavedSections(prev => ({ ...prev, [section]: true }));
        setTimeout(() => {
          setSavedSections(prev => ({ ...prev, [section]: false }));
        }, 3000);
      } else {
        console.error('Failed to save preferences:', responseData);
        showError('Save Failed', `Failed to save preferences: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showError('Network Error', 'Network error while saving preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPermission = async () => {
    if (!isSupported) {
      showError('Not Supported', 'Desktop notifications are not supported in this browser');
      return;
    }

    try {
      const granted = await requestPermission();
      if (granted) {
        success('Permission Granted', 'Desktop notifications are now enabled');
        setNotifications(prev => ({ ...prev, push: true }));
      } else {
        showError('Permission Denied', 'Desktop notifications were blocked. Please enable them in your browser settings.');
      }
    } catch {
      showError('Error', 'Failed to request notification permission');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-3 sm:px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your account and preferences</p>
        </div>


        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full overflow-x-auto border-b border-border">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-none bg-transparent p-0 w-full">
            <TabsTrigger 
              value="appearance" 
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Palette className="w-4 h-4 mr-2" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Bell className="w-4 h-4 mr-2" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Shield className="w-4 h-4 mr-2" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger 
              value="categories" 
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Tag className="w-4 h-4 mr-2" />
              <span>Categories</span>
            </TabsTrigger>
            <TabsTrigger 
              value="documentation" 
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span>Docs</span>
            </TabsTrigger>
          </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="appearance" className="space-y-6">
            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Theme</span>
                </CardTitle>
                <CardDescription>
                  Choose your preferred color theme for the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Light Theme */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      theme === 'light' 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setTheme('light')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <Sun className="w-5 h-5 text-foreground" />
                        <span className="font-medium text-foreground">Light</span>
                        {theme === 'light' && <Badge variant="secondary">Active</Badge>}
                      </div>
                      <div className="w-full h-16 bg-white border border-gray-200 rounded flex items-center justify-center">
                        <div className="w-8 h-8 bg-gray-800 rounded"></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Clean and bright interface</p>
                    </CardContent>
                  </Card>

                  {/* Dark Theme */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      theme === 'dark' 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setTheme('dark')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <Moon className="w-5 h-5 text-foreground" />
                        <span className="font-medium text-foreground">Dark</span>
                        {theme === 'dark' && <Badge variant="secondary">Active</Badge>}
                      </div>
                      <div className="w-full h-16 bg-gray-800 border border-gray-600 rounded flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded"></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Easy on the eyes</p>
                    </CardContent>
                  </Card>

                  {/* High Contrast Theme */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      theme === 'high-contrast' 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setTheme('high-contrast')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <Contrast className="w-5 h-5 text-foreground" />
                        <span className="font-medium text-foreground">High Contrast</span>
                        {theme === 'high-contrast' && <Badge variant="secondary">Active</Badge>}
                      </div>
                      <div className="w-full h-16 bg-black border-2 border-white rounded flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded"></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Maximum accessibility</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Language & Region */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Language & Region</span>
                </CardTitle>
                <CardDescription>
                  Configure your language and currency preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={preferences.language} 
                      onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">हिन्दी</SelectItem>
                        <SelectItem value="ta">தமிழ்</SelectItem>
                        <SelectItem value="te">తెలుగు</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={selectedCurrency} 
                      onValueChange={(value) => {
                        setSelectedCurrency(value);
                        setPreferences(prev => ({ ...prev, currency: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="GBP">British Pound (£)</SelectItem>
                        <SelectItem value="JPY">Japanese Yen (¥)</SelectItem>
                        <SelectItem value="CAD">Canadian Dollar (C$)</SelectItem>
                        <SelectItem value="AUD">Australian Dollar (A$)</SelectItem>
                        <SelectItem value="CHF">Swiss Franc (CHF)</SelectItem>
                        <SelectItem value="CNY">Chinese Yuan (¥)</SelectItem>
                        <SelectItem value="SEK">Swedish Krona (kr)</SelectItem>
                        <SelectItem value="NOK">Norwegian Krone (kr)</SelectItem>
                        <SelectItem value="DKK">Danish Krone (kr)</SelectItem>
                        <SelectItem value="PLN">Polish Zloty (zł)</SelectItem>
                        <SelectItem value="CZK">Czech Koruna (Kč)</SelectItem>
                        <SelectItem value="HUF">Hungarian Forint (Ft)</SelectItem>
                        <SelectItem value="RUB">Russian Ruble (₽)</SelectItem>
                        <SelectItem value="BRL">Brazilian Real (R$)</SelectItem>
                        <SelectItem value="MXN">Mexican Peso ($)</SelectItem>
                        <SelectItem value="KRW">South Korean Won (₩)</SelectItem>
                        <SelectItem value="SGD">Singapore Dollar (S$)</SelectItem>
                        <SelectItem value="HKD">Hong Kong Dollar (HK$)</SelectItem>
                        <SelectItem value="NZD">New Zealand Dollar (NZ$)</SelectItem>
                        <SelectItem value="ZAR">South African Rand (R)</SelectItem>
                        <SelectItem value="TRY">Turkish Lira (₺)</SelectItem>
                        <SelectItem value="AED">UAE Dirham (د.إ)</SelectItem>
                        <SelectItem value="SAR">Saudi Riyal (﷼)</SelectItem>
                        <SelectItem value="QAR">Qatari Riyal (﷼)</SelectItem>
                        <SelectItem value="KWD">Kuwaiti Dinar (د.ك)</SelectItem>
                        <SelectItem value="BHD">Bahraini Dinar (د.ب)</SelectItem>
                        <SelectItem value="OMR">Omani Rial (﷼)</SelectItem>
                        <SelectItem value="JOD">Jordanian Dinar (د.ا)</SelectItem>
                        <SelectItem value="LBP">Lebanese Pound (ل.ل)</SelectItem>
                        <SelectItem value="EGP">Egyptian Pound (£)</SelectItem>
                        <SelectItem value="MAD">Moroccan Dirham (د.م.)</SelectItem>
                        <SelectItem value="TND">Tunisian Dinar (د.ت)</SelectItem>
                        <SelectItem value="DZD">Algerian Dinar (د.ج)</SelectItem>
                        <SelectItem value="LYD">Libyan Dinar (ل.د)</SelectItem>
                        <SelectItem value="SDG">Sudanese Pound (ج.س.)</SelectItem>
                        <SelectItem value="ETB">Ethiopian Birr (Br)</SelectItem>
                        <SelectItem value="KES">Kenyan Shilling (KSh)</SelectItem>
                        <SelectItem value="UGX">Ugandan Shilling (USh)</SelectItem>
                        <SelectItem value="TZS">Tanzanian Shilling (TSh)</SelectItem>
                        <SelectItem value="MWK">Malawian Kwacha (MK)</SelectItem>
                        <SelectItem value="ZMW">Zambian Kwacha (ZK)</SelectItem>
                        <SelectItem value="BWP">Botswana Pula (P)</SelectItem>
                        <SelectItem value="SZL">Swazi Lilangeni (L)</SelectItem>
                        <SelectItem value="LSL">Lesotho Loti (L)</SelectItem>
                        <SelectItem value="NAD">Namibian Dollar (N$)</SelectItem>
                        <SelectItem value="MUR">Mauritian Rupee (₨)</SelectItem>
                        <SelectItem value="SCR">Seychellois Rupee (₨)</SelectItem>
                        <SelectItem value="MVR">Maldivian Rufiyaa (ރ)</SelectItem>
                        <SelectItem value="LKR">Sri Lankan Rupee (₨)</SelectItem>
                        <SelectItem value="BDT">Bangladeshi Taka (৳)</SelectItem>
                        <SelectItem value="NPR">Nepalese Rupee (₨)</SelectItem>
                        <SelectItem value="PKR">Pakistani Rupee (₨)</SelectItem>
                        <SelectItem value="AFN">Afghan Afghani (؋)</SelectItem>
                        <SelectItem value="IRR">Iranian Rial (﷼)</SelectItem>
                        <SelectItem value="IQD">Iraqi Dinar (ع.د)</SelectItem>
                        <SelectItem value="SYP">Syrian Pound (£)</SelectItem>
                        <SelectItem value="YER">Yemeni Rial (﷼)</SelectItem>
                        <SelectItem value="ILS">Israeli Shekel (₪)</SelectItem>
                        <SelectItem value="PEN">Peruvian Sol (S/)</SelectItem>
                        <SelectItem value="CLP">Chilean Peso ($)</SelectItem>
                        <SelectItem value="COP">Colombian Peso ($)</SelectItem>
                        <SelectItem value="ARS">Argentine Peso ($)</SelectItem>
                        <SelectItem value="UYU">Uruguayan Peso ($U)</SelectItem>
                        <SelectItem value="PYG">Paraguayan Guarani (₲)</SelectItem>
                        <SelectItem value="BOB">Bolivian Boliviano (Bs)</SelectItem>
                        <SelectItem value="VES">Venezuelan Bolivar (Bs.S)</SelectItem>
                        <SelectItem value="VEF">Venezuelan Bolivar (Bs)</SelectItem>
                        <SelectItem value="GYD">Guyanese Dollar (G$)</SelectItem>
                        <SelectItem value="SRD">Surinamese Dollar ($)</SelectItem>
                        <SelectItem value="TTD">Trinidad and Tobago Dollar (TT$)</SelectItem>
                        <SelectItem value="BBD">Barbadian Dollar (Bds$)</SelectItem>
                        <SelectItem value="JMD">Jamaican Dollar (J$)</SelectItem>
                        <SelectItem value="XCD">East Caribbean Dollar ($)</SelectItem>
                        <SelectItem value="AWG">Aruban Florin (ƒ)</SelectItem>
                        <SelectItem value="BZD">Belize Dollar (BZ$)</SelectItem>
                        <SelectItem value="GTQ">Guatemalan Quetzal (Q)</SelectItem>
                        <SelectItem value="HNL">Honduran Lempira (L)</SelectItem>
                        <SelectItem value="NIO">Nicaraguan Cordoba (C$)</SelectItem>
                        <SelectItem value="CRC">Costa Rican Colon (₡)</SelectItem>
                        <SelectItem value="PAB">Panamanian Balboa (B/.)</SelectItem>
                        <SelectItem value="DOP">Dominican Peso (RD$)</SelectItem>
                        <SelectItem value="HTG">Haitian Gourde (G)</SelectItem>
                        <SelectItem value="CUP">Cuban Peso ($)</SelectItem>
                        <SelectItem value="BMD">Bermudian Dollar ($)</SelectItem>
                        <SelectItem value="KYD">Cayman Islands Dollar ($)</SelectItem>
                        <SelectItem value="BSD">Bahamian Dollar ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    {lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        Exchange rates last updated: {lastUpdated.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => handleSave('Appearance')}
                disabled={loading}
                className="flex items-center space-x-2 btn-touch"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>

            {/* Success Message */}
            {savedSections['Appearance'] && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5" />
                <span>Appearance settings saved successfully!</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Email Notifications</span>
                </CardTitle>
                <CardDescription>
                  Configure your email notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="transaction-alerts">Transaction Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified about new transactions</p>
                  </div>
                  <Switch
                    id="transaction-alerts"
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive updates about new features</p>
                  </div>
                  <Switch
                    id="marketing-emails"
                    checked={notifications.marketing}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5" />
                  <span>Push Notifications</span>
                </CardTitle>
                <CardDescription>
                  Configure browser and mobile notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="browser-notifications">Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show notifications in your browser</p>
                    {!isSupported && (
                      <p className="text-xs text-red-500">Notifications not supported in this browser</p>
                    )}
                    {isSupported && permission === 'denied' && (
                      <p className="text-xs text-red-500">Notifications blocked. Please enable in browser settings.</p>
                    )}
                    {isSupported && permission === 'granted' && (
                      <p className="text-xs text-green-500">Notifications enabled</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isSupported && permission !== 'granted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNotificationPermission}
                      >
                        Enable Notifications
                      </Button>
                    )}
                  <Switch
                    id="browser-notifications"
                      checked={notifications.push && permission === 'granted'}
                      onCheckedChange={(checked) => {
                        if (checked && permission !== 'granted') {
                          handleNotificationPermission();
                        } else {
                          setNotifications(prev => ({ ...prev, push: checked }));
                        }
                      }}
                      disabled={!isSupported}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => handleSave('Notifications')}
                disabled={loading}
                className="flex items-center space-x-2 btn-touch"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Password</span>
                </CardTitle>
                <CardDescription>
                  Change your account password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" placeholder="Enter current password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" placeholder="Enter new password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" placeholder="Confirm new password" />
                </div>
                <Button className="flex items-center space-x-2 btn-touch">
                  <Key className="w-4 h-4" />
                  <span>Change Password</span>
                </Button>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Privacy</span>
                </CardTitle>
                <CardDescription>
                  Control your privacy and data sharing preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="data-sharing">Data Sharing</Label>
                    <p className="text-sm text-muted-foreground">Allow anonymous usage data collection</p>
                  </div>
                  <Switch
                    id="data-sharing"
                    checked={privacy.dataSharing}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, dataSharing: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="analytics">Analytics</Label>
                    <p className="text-sm text-muted-foreground">Help improve the app with usage analytics</p>
                  </div>
                  <Switch
                    id="analytics"
                    checked={privacy.analytics}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, analytics: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label>Delete Account</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" className="flex items-center space-x-2 btn-touch">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="documentation" className="space-y-6">
            <DocumentManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
