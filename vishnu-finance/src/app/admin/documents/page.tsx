"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Trash2,
  Upload,
  Shield,
  Filter,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/contexts/ToastContext";
import { Switch } from "@/components/ui/switch";
import { formatFileSize, validateDeleteMode } from "@/lib/document-utils";

type AdminDocument = {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  isDeleted: boolean;
  visibility: "PRIVATE" | "ORGANIZATION" | "PUBLIC";
  sourceType: "USER_UPLOAD" | "BANK_STATEMENT" | "PORTAL_RESOURCE" | "SYSTEM";
  owner?: { id: string; email: string | null; name: string | null } | null;
  ownerId?: string | null;
  uploadedById: string;
  deletedBy?: { id: string; email: string | null; name: string | null } | null;
  bankCode?: string | null;
  transactionCount: number;
};

export default function AdminDocumentsPage() {
  const { success, error: showError } = useToast();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({
    visibility: "ALL",
    bankCode: "",
    search: "",
    includeDeleted: true,
  });
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    document: AdminDocument | null;
    mode: "document-only" | "document-and-transactions";
    submitting: boolean;
  }>({ open: false, document: null, mode: "document-only", submitting: false });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ownerIdInput, setOwnerIdInput] = useState("");
  const [visibilityInput, setVisibilityInput] = useState<"PUBLIC" | "ORGANIZATION" | "PRIVATE">("ORGANIZATION");
  const [bankCodeInput, setBankCodeInput] = useState("");
  const [notes, setNotes] = useState("");

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.visibility !== "ALL") {
        params.set("visibility", filters.visibility);
      }
      if (filters.bankCode) {
        params.set("bankCode", filters.bankCode);
      }
      if (filters.search) {
        params.set("search", filters.search);
      }
      if (filters.includeDeleted) {
        params.set("includeDeleted", "true");
      }

      const response = await fetch(`/api/admin/documents?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load documents");
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Admin document fetch failed:", error);
      showError("Error", "Unable to load document library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDocuments = useMemo(() => documents, [documents]);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showError("Upload failed", "Please choose a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", visibilityInput);
      if (ownerIdInput.trim()) {
        formData.append("ownerId", ownerIdInput.trim());
      }
      if (bankCodeInput.trim()) {
        formData.append("bankCode", bankCodeInput.trim());
      }
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const response = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setDocuments(prev => [data.document, ...prev]);
      success("Uploaded", `${file.name} added to admin library`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setNotes("");
      setOwnerIdInput("");
      setBankCodeInput("");
    } catch (error) {
      console.error("Admin upload error:", error);
      showError("Upload failed", "Could not upload the document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const openDeleteDialog = (document: AdminDocument) => {
    setDeleteState({ open: true, document, mode: "document-only", submitting: false });
  };

  const closeDeleteDialog = () => {
    setDeleteState(prev => ({ ...prev, open: false, document: null, submitting: false }));
  };

  const handleRestore = async (document: AdminDocument, restoreTransactions: boolean) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true, restoreTransactions }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to restore" }));
        throw new Error(data.error || "Failed to restore document");
      }

      const data = await response.json();
      success(
        "Restored",
        restoreTransactions
          ? `Document and ${data.restoredTransactions ?? 0} transactions restored.`
          : "Document restored successfully.",
      );
      fetchDocuments();
    } catch (error: any) {
      console.error("Admin restore document failed:", error);
      showError("Error", error?.message || "Unable to restore document");
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteState.document) return;

    setDeleteState(prev => ({ ...prev, submitting: true }));
    try {
      const response = await fetch(`/api/admin/documents/${deleteState.document.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: deleteState.mode }),
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setDocuments(prev => prev.filter(doc => doc.id !== deleteState.document?.id));
      const message =
        deleteState.mode === "document-and-transactions"
          ? "Document and linked transactions deleted."
          : "Document removed from library.";
      success("Deleted", message);
      closeDeleteDialog();
    } catch (error) {
      console.error("Admin delete error:", error);
      showError("Delete failed", "Could not delete the document.");
      setDeleteState(prev => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>Portal Document Library</span>
          </CardTitle>
          <CardDescription>
            Upload platform-wide resources, manage bank statement archives, and track system-generated documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-doc-file">Upload PDF</Label>
              <Input ref={fileInputRef} id="admin-doc-file" type="file" accept="application/pdf" />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibilityInput} onValueChange={value => setVisibilityInput(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public (Everyone)</SelectItem>
                  <SelectItem value="ORGANIZATION">Organization</SelectItem>
                  <SelectItem value="PRIVATE">Private (Specific user)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-doc-owner">Assign to User (optional)</Label>
              <Input
                id="admin-doc-owner"
                value={ownerIdInput}
                onChange={e => setOwnerIdInput(e.target.value)}
                placeholder="User ID to own this document"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-doc-bank">Bank Code (optional)</Label>
              <Input
                id="admin-doc-bank"
                value={bankCodeInput}
                onChange={e => setBankCodeInput(e.target.value)}
                placeholder="e.g. HDFC, SBIN"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="admin-doc-notes">Notes / Metadata (optional)</Label>
              <Textarea
                id="admin-doc-notes"
                rows={3}
                placeholder="Additional context stored with the document"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button onClick={handleUpload} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Publish Document"}
            </Button>
            <Button variant="outline" onClick={fetchDocuments} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh List
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">Documents</CardTitle>
            <CardDescription>Filter library entries and manage retention.</CardDescription>
          </div>
          <div className="w-full flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select
                value={filters.visibility}
                onValueChange={value => setFilters(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="ORGANIZATION">Organization</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={filters.bankCode}
              onChange={e => setFilters(prev => ({ ...prev, bankCode: e.target.value }))}
              placeholder="Bank code"
              className="w-full sm:w-28"
            />
            <Input
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search name"
              className="w-full sm:w-40"
            />
            <div className="flex items-center gap-2 pl-1">
              <Switch
                checked={filters.includeDeleted}
                onCheckedChange={value => setFilters(prev => ({ ...prev, includeDeleted: value }))}
              />
              <span className="text-xs text-muted-foreground">Include deleted</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDocuments}
              disabled={loading}
            >
              Apply
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
              No documents match the current filters.
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium hidden lg:table-cell">Owner</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Visibility</th>
                      <th className="px-4 py-2 text-left font-medium hidden lg:table-cell">Bank</th>
                      <th className="px-4 py-2 text-left font-medium">Transactions</th>
                      <th className="px-4 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDocuments.map(doc => (
                      <tr key={doc.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{doc.originalName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{doc.sourceType.replace("_", " ")}</span>
                            <Separator orientation="vertical" />
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <Separator orientation="vertical" />
                            <span>{new Date(doc.createdAt).toLocaleString()}</span>
                          </div>
                          {doc.isDeleted && (
                            <div className="text-[11px] text-muted-foreground mt-1">
                              Deleted {doc.deletedAt ? new Date(doc.deletedAt).toLocaleString() : ''}
                              {doc.deletedBy ? ` by ${doc.deletedBy.email || doc.deletedBy.name || doc.deletedBy.id}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {doc.owner
                            ? `${doc.owner.name || doc.owner.email || doc.owner.id}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={doc.isDeleted ? "destructive" : "secondary"}>
                            {doc.isDeleted ? "deleted" : "active"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{doc.visibility.toLowerCase()}</Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {doc.bankCode || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {doc.transactionCount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="outline" size="sm" asChild disabled={doc.isDeleted}>
                              <Link href={`/api/user/documents/${doc.id}/download`} target="_blank">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Link>
                            </Button>
                            {doc.isDeleted ? (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleRestore(doc, false)}
                                >
                                  <RotateCw className="w-4 h-4" />
                                  Restore
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleRestore(doc, true)}
                                >
                                  <RotateCw className="w-4 h-4" />
                                  Restore + Txns
                                </Button>
                              </>
                            ) : (
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredDocuments.map(doc => (
                  <div key={doc.id} className="rounded-lg border border-border/60 bg-card p-4 shadow-sm space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground">{doc.originalName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {doc.sourceType.replace("_", " ")} • {new Date(doc.createdAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Size: {formatFileSize(doc.fileSize)} • Bank: {doc.bankCode || '—'} • Transactions: {doc.transactionCount}
                          </p>
                          {doc.isDeleted && (
                            <p className="text-[11px] text-muted-foreground">
                              Deleted {doc.deletedAt ? new Date(doc.deletedAt).toLocaleString() : ''}
                              {doc.deletedBy ? ` by ${doc.deletedBy.email || doc.deletedBy.name || doc.deletedBy.id}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary">{doc.visibility.toLowerCase()}</Badge>
                          <Badge variant={doc.isDeleted ? "destructive" : "secondary"}>
                            {doc.isDeleted ? "deleted" : "active"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 min-w-[120px]"
                        disabled={doc.isDeleted}
                      >
                        <Link href={`/api/user/documents/${doc.id}/download`} target="_blank">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Link>
                      </Button>
                      {doc.isDeleted ? (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 min-w-[120px]"
                            onClick={() => handleRestore(doc, false)}
                          >
                            Restore
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 min-w-[120px]"
                            onClick={() => handleRestore(doc, true)}
                          >
                            Restore + Txns
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 min-w-[120px]"
                          onClick={() => openDeleteDialog(doc)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteState.open} onOpenChange={open => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              Decide whether to keep linked transactions or remove them with the document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-muted/60 text-sm">
              <p className="font-medium text-foreground">{deleteState.document?.originalName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {deleteState.document?.transactionCount || 0} transaction(s) linked.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Delete Options</Label>
              <div className="grid gap-2">
                {(["document-only", "document-and-transactions"] as const).map(option => (
                  <Button
                    key={option}
                    variant={deleteState.mode === option ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setDeleteState(prev => ({ ...prev, mode: validateDeleteMode(option) }))
                    }
                  >
                    {option === "document-only"
                      ? "Keep transactions, delete document"
                      : "Delete document & transactions"}
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
              {deleteState.submitting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

