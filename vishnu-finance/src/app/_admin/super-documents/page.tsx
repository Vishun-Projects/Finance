'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/ToastContext';
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react';
import { formatFileSize } from '@/lib/document-utils';

type SuperDocumentCategory = 'INCOME_TAX' | 'INVESTMENT' | 'INSURANCE' | 'RETIREMENT' | 'DEBT_MANAGEMENT' | 'BUDGETING' | 'SAVINGS' | 'OTHER';

type SuperDocument = {
  id: string;
  title: string;
  description: string | null;
  category: SuperDocumentCategory;
  originalName: string;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    id: string;
    email: string;
    name: string | null;
  };
};

const CATEGORY_LABELS: Record<SuperDocumentCategory, string> = {
  INCOME_TAX: 'Income Tax',
  INVESTMENT: 'Investment',
  INSURANCE: 'Insurance',
  RETIREMENT: 'Retirement',
  DEBT_MANAGEMENT: 'Debt Management',
  BUDGETING: 'Budgeting',
  SAVINGS: 'Savings',
  OTHER: 'Other',
};

export default function AdminSuperDocumentsPage() {
  const { success, error: showError } = useToast();
  const [documents, setDocuments] = useState<SuperDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SuperDocumentCategory>('INCOME_TAX');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/admin/super-documents?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Super document fetch failed:', error);
      showError('Error', 'Unable to load super documents.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showError]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async () => {
    const file = fileInputRef?.files?.[0];
    if (!file) {
      showError('Upload failed', 'Please choose a PDF file to upload.');
      return;
    }

    if (!title.trim()) {
      showError('Upload failed', 'Please enter a title.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('category', category);

      const response = await fetch('/api/admin/super-documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setDocuments((prev) => [data.document, ...prev]);
      success('Uploaded', `${file.name} added as super document`);
      
      // Reset form
      if (fileInputRef) {
        fileInputRef.value = '';
      }
      setTitle('');
      setDescription('');
      setCategory('INCOME_TAX');
    } catch (error) {
      console.error('Super document upload error:', error);
      showError('Upload failed', error instanceof Error ? error.message : 'Could not upload the document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string, documentTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${documentTitle}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/super-documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      success('Deleted', `${documentTitle} has been deleted`);
      fetchDocuments();
    } catch (error) {
      console.error('Super document delete error:', error);
      showError('Delete failed', 'Could not delete the document.');
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query) ||
      CATEGORY_LABELS[doc.category].toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Super Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload financial documents (Income Tax guides, etc.) that will be used by the AI advisor to answer user questions.
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Super Document</CardTitle>
          <CardDescription>Upload PDF documents that will be searchable by the AI advisor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">PDF File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,application/pdf"
              ref={(el) => setFileInputRef(el)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Income Tax Guide 2024"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as SuperDocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleUpload} disabled={uploading || !title.trim()}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Super Documents</CardTitle>
              <CardDescription>Documents available for AI advisor search</CardDescription>
            </div>
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'No documents match your search.' : 'No super documents uploaded yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium text-foreground">{doc.title}</h3>
                      <Badge variant="secondary">{CATEGORY_LABELS[doc.category]}</Badge>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{doc.originalName}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

