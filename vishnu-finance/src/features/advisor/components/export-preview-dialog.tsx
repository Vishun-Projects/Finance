'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Eye, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { parseMarkdownTables } from '@/lib/advisor-format';

export type ExportPreviewFormat = 'csv' | 'html' | 'xlsx' | 'pdf' | 'docx';

export interface ExportPreviewState {
  format: ExportPreviewFormat;
  filename: string;
  mimeType: string;
  blob: Blob;
  blobUrl: string;
}

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: ExportPreviewState | null;
  markdown: string;
  busy?: boolean;
  onDownload: () => void;
}

function TablesPreview({ markdown }: { markdown: string }) {
  const tables = useMemo(() => parseMarkdownTables(markdown), [markdown]);
  if (tables.length === 0) {
    return (
      <p className="text-sm text-muted">
        No markdown tables found to preview. Download the file to inspect the full export.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {tables.map((table, ti) => (
        <div key={ti} className="overflow-x-auto rounded-lg border border-border">
          {table.title ? (
            <div className="border-b border-border bg-surface px-3 py-1.5 text-xs font-medium">
              {table.title}
            </div>
          ) : null}
          <table className="w-full min-w-[320px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {table.headers.map((h, i) => (
                  <th key={i} className="px-2 py-1.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.slice(0, 40).map((row, ri) => (
                <tr key={ri} className="border-b border-border/60">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 tabular-nums">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {table.rows.length > 40 ? (
            <p className="px-2 py-1 text-[10px] text-muted">
              Showing 40 of {table.rows.length} rows — download for the full file.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Inline HTML preview — avoids blank iframes under dialog CSS transforms / empty sandbox. */
function HtmlDocumentPreview({ html }: { html: string }) {
  const bodyHtml = useMemo(() => {
    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match?.[1] ?? html;
  }, [html]);

  return (
    <div
      className="max-h-[50vh] overflow-auto rounded-md border border-border bg-white p-4 text-[13px] leading-relaxed text-neutral-900 [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-300 [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left"
      // Own export pipeline escapes cell text before building HTML.
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  preview,
  markdown,
  busy,
  onDownload,
}: ExportPreviewDialogProps) {
  const [textPreview, setTextPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!preview || (preview.format !== 'csv' && preview.format !== 'html')) {
      setTextPreview(null);
      return;
    }
    void preview.blob
      .text()
      .then((t) => {
        if (!cancelled) setTextPreview(t);
      })
      .catch(() => {
        if (!cancelled) setTextPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const formatLabel = preview?.format.toUpperCase() ?? 'Export';

  const openPdfInNewTab = () => {
    if (!preview?.blobUrl) return;
    window.open(preview.blobUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-3 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4" />
            Preview {formatLabel}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {preview?.filename
              ? `Review ${preview.filename} before downloading.`
              : 'Review the export before downloading.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background p-3">
          {busy || !preview ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Generating preview…
            </div>
          ) : preview.format === 'csv' ? (
            textPreview == null ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" />
                Loading CSV…
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                {textPreview.slice(0, 12000)}
                {textPreview.length > 12000 ? '\n\n[Truncated in preview]' : ''}
              </pre>
            )
          ) : preview.format === 'html' ? (
            textPreview == null ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" />
                Loading HTML…
              </div>
            ) : textPreview.trim() ? (
              <HtmlDocumentPreview html={textPreview} />
            ) : (
              <p className="text-sm text-muted">HTML export was empty.</p>
            )
          ) : preview.format === 'pdf' ? (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                PDF embeds often fail inside modals. Review the tables below, open the PDF in a new
                tab, or download when ready.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={openPdfInNewTab}
              >
                <ExternalLink className="size-3.5" />
                Open PDF in new tab
              </Button>
              <TablesPreview markdown={markdown} />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted">
                Live table preview from the advisor reply. The downloaded {formatLabel} file
                includes full formatting.
              </p>
              <TablesPreview markdown={markdown} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            disabled={!preview || busy}
            onClick={onDownload}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Download {formatLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
