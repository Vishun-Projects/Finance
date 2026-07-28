'use client';

import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasMarkdownTable } from '@/lib/advisor-format';
import { cn } from '@/lib/utils';
import {
  ExportPreviewDialog,
  type ExportPreviewFormat,
  type ExportPreviewState,
} from '@/features/advisor/components/export-preview-dialog';

const FORMATS: Array<{ id: ExportPreviewFormat; label: string }> = [
  { id: 'csv', label: 'CSV' },
  { id: 'html', label: 'HTML' },
  { id: 'xlsx', label: 'Excel' },
  { id: 'pdf', label: 'PDF' },
  { id: 'docx', label: 'Word' },
];

interface AdvisorExportActionsProps {
  markdown: string;
  title?: string;
  className?: string;
  /** Auto-provided file from chat when user asked for a downloadable format */
  attachment?: {
    format: ExportPreviewFormat;
    filename: string;
    mimeType: string;
    base64: string;
  };
  /** Open preview for attachment once when the message arrives */
  autoOpenPreview?: boolean;
}

function triggerDownload(filename: string, mimeType: string, data: BlobPart | Uint8Array) {
  const part: BlobPart = data instanceof Uint8Array ? new Uint8Array(data) : data;
  const blob = new Blob([part], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function revokePreview(preview: ExportPreviewState | null) {
  if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
}

const FORMAT_MIME: Record<ExportPreviewFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  html: 'text/html; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function blobWithMime(
  data: Blob | BlobPart | Uint8Array,
  format: ExportPreviewFormat,
  mimeHint?: string,
): Blob {
  const mime = (mimeHint && mimeHint.trim()) || FORMAT_MIME[format];
  if (data instanceof Blob) {
    return new Blob([data], { type: mime });
  }
  const part: BlobPart = data instanceof Uint8Array ? new Uint8Array(data) : data;
  return new Blob([part], { type: mime });
}

export function AdvisorExportActions({
  markdown,
  title = 'Advisor export',
  className,
  attachment,
  autoOpenPreview = false,
}: AdvisorExportActionsProps) {
  const [busy, setBusy] = useState<ExportPreviewFormat | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<ExportPreviewState | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  const show = hasMarkdownTable(markdown) || Boolean(attachment);

  const openPreview = (next: ExportPreviewState) => {
    setPreview((prev) => {
      revokePreview(prev);
      return next;
    });
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!show || !autoOpenPreview || !attachment || autoOpened) return;
    const bytes = base64ToUint8Array(attachment.base64);
    const blob = blobWithMime(bytes, attachment.format, attachment.mimeType);
    openPreview({
      format: attachment.format,
      filename: attachment.filename,
      mimeType: blob.type || attachment.mimeType,
      blob,
      blobUrl: URL.createObjectURL(blob),
    });
    setAutoOpened(true);
  }, [show, autoOpenPreview, attachment, autoOpened]);

  useEffect(() => {
    return () => {
      setPreview((prev) => {
        revokePreview(prev);
        return null;
      });
    };
  }, []);

  if (!show) return null;

  const downloadViaApi = async (format: ExportPreviewFormat) => {
    setBusy(format);
    setDialogOpen(true);
    setPreview((prev) => {
      revokePreview(prev);
      return null;
    });
    try {
      const response = await fetch('/api/advisor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, format, title }),
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const rawBlob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `advisor-export.${format}`;
      const mime =
        response.headers.get('Content-Type') || rawBlob.type || FORMAT_MIME[format];
      const blob = blobWithMime(rawBlob, format, mime);
      openPreview({
        format,
        filename,
        mimeType: blob.type || mime,
        blob,
        blobUrl: URL.createObjectURL(blob),
      });
    } catch (err) {
      console.error(err);
      setDialogOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    triggerDownload(preview.filename, preview.mimeType, preview.blob);
  };

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-1.5 pt-1', className)}>
        <span className="mr-1 inline-flex items-center gap-1 text-[11px] text-muted">
          <Download className="size-3" />
          Export
        </span>
        {attachment ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => {
              const bytes = base64ToUint8Array(attachment.base64);
              const blob = blobWithMime(bytes, attachment.format, attachment.mimeType);
              openPreview({
                format: attachment.format,
                filename: attachment.filename,
                mimeType: blob.type || attachment.mimeType,
                blob,
                blobUrl: URL.createObjectURL(blob),
              });
            }}
          >
            <FileSpreadsheet className="mr-1 size-3" />
            Preview {attachment.format.toUpperCase()}
          </Button>
        ) : null}
        {FORMATS.map((fmt) => (
          <Button
            key={fmt.id}
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted"
            disabled={busy != null}
            onClick={() => void downloadViaApi(fmt.id)}
          >
            {busy === fmt.id ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <FileText className="mr-1 size-3" />
            )}
            {fmt.label}
          </Button>
        ))}
      </div>

      <ExportPreviewDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setPreview((prev) => {
              revokePreview(prev);
              return null;
            });
          }
        }}
        preview={preview}
        markdown={markdown}
        busy={busy != null && !preview}
        onDownload={handleDownload}
      />
    </>
  );
}
