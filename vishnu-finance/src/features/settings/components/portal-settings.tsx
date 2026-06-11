'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Upload,
  Download,
  Trash2,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatFileSize, validateDeleteMode } from '@/lib/document-utils';
import type { UserDocumentSummary } from '@/types/documents';
import {
  SettingsPageLayout,
  SettingsSectionHeader,
  SettingsGroup,
  SettingsToggleRow,
} from '@/features/settings/components/settings-ui';

type PortalSettingsProps = {
  initialDocuments?: UserDocumentSummary[];
};

export function PortalSettings({ initialDocuments }: PortalSettingsProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const hasInitialDocuments = typeof initialDocuments !== 'undefined';
  const [documents, setDocuments] = useState<UserDocumentSummary[]>(initialDocuments ?? []);
  const [loading, setLoading] = useState(!hasInitialDocuments);
  const [uploading, setUploading] = useState(false);
  const [includePortal, setIncludePortal] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'portal'>('all');
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    document: UserDocumentSummary | null;
    mode: 'document-only' | 'document-and-transactions';
    submitting: boolean;
  }>({ open: false, document: null, mode: 'document-only', submitting: false });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasBootstrapDocumentsRef = useRef(hasInitialDocuments);

  const fetchDocuments = useCallback(
    async ({ showSpinner = true }: { showSpinner?: boolean } = {}) => {
      if (showSpinner) {
        setLoading(true);
      }
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
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [includePortal, showError]
  );

  useEffect(() => {
    const showSpinner = !hasBootstrapDocumentsRef.current;
    hasBootstrapDocumentsRef.current = false;
    fetchDocuments({ showSpinner });
  }, [fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    if (!user) return documents;
    switch (filter) {
      case 'mine':
        return documents.filter(
          (doc) => doc.ownerId === user.id || doc.uploadedById === user.id
        );
      case 'portal':
        return documents.filter(
          (doc) => doc.visibility !== 'PRIVATE' && doc.ownerId !== user.id
        );
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
      setDocuments((prev) => [data.document, ...prev]);
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

  const openDeleteDialog = (document: UserDocumentSummary) => {
    setDeleteState({
      open: true,
      document,
      mode: 'document-only',
      submitting: false,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteState((prev) => ({ ...prev, open: false, document: null, submitting: false }));
  };

  const confirmDelete = async () => {
    if (!deleteState.document) return;
    setDeleteState((prev) => ({ ...prev, submitting: true }));
    try {
      const response = await fetch(`/api/user/documents/${deleteState.document.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: deleteState.mode }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== deleteState.document?.id));
      const message =
        deleteState.mode === 'document-and-transactions'
          ? 'Document and linked transactions deleted.'
          : 'Document deleted. Transactions will remain.';
      success('Deleted', message);
      closeDeleteDialog();
    } catch (error) {
      console.error('Delete error:', error);
      showError('Delete failed', 'Could not delete the document.');
      setDeleteState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const filterOptions: { id: typeof filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'My uploads' },
    { id: 'portal', label: 'Portal' },
  ];

  return (
    <SettingsPageLayout>
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <SettingsSectionHeader className="mb-0">Documents</SettingsSectionHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDocuments({ showSpinner: true })}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleFilePick} disabled={uploading} className="h-8">
              <Upload className="mr-1.5 size-3.5" />
              {uploading ? 'Uploading…' : 'Upload PDF'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </div>

        <SettingsGroup>
          <SettingsToggleRow
            label="Include portal documents"
            hint="Show shared portal files in the list"
            checked={includePortal}
            onCheckedChange={setIncludePortal}
          />
          <div className="flex gap-1 border-t border-border px-3 py-2">
            {filterOptions.map((option) => (
              <Button
                key={option.id}
                variant={filter === option.id ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Loading documents…
            </p>
          ) : filteredDocuments.length === 0 ? (
            <p className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No documents found. Upload a PDF to get started.
            </p>
          ) : (
            filteredDocuments.map((doc) => {
              const canDelete =
                user &&
                (doc.ownerId === user.id || doc.uploadedById === user.id) &&
                doc.visibility === 'PRIVATE';

              return (
                <div
                  key={doc.id}
                  className="flex min-h-11 items-center gap-3 border-t border-border px-4 py-3"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.originalName}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>·</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {doc.sourceType.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                      <Link href={`/api/user/documents/${doc.id}/download`} target="_blank">
                        <Download className="size-4" />
                      </Link>
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(doc)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground opacity-40" />
                  </div>
                </div>
              );
            })
          )}
        </SettingsGroup>
      </div>

      <Dialog open={deleteState.open} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove document</DialogTitle>
            <DialogDescription>
              Choose whether to remove just the document or delete the linked transactions as well.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/60 p-3 text-sm">
              <p className="font-medium">{deleteState.document?.originalName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {deleteState.document?.transactionCount || 0} transaction(s) linked.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Delete options</Label>
              <div className="grid gap-2">
                {(['document-only', 'document-and-transactions'] as const).map((option) => (
                  <Button
                    key={option}
                    variant={deleteState.mode === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setDeleteState((prev) => ({ ...prev, mode: validateDeleteMode(option) }))
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
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteState.submitting}>
              {deleteState.submitting ? 'Deleting…' : 'Confirm delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageLayout>
  );
}
