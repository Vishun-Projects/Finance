'use client';

import { AlertCircle, FileText, RefreshCw, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { MotionButton } from '@/components/ui/motion-button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { getWhileTap } from '@/lib/motion-utils';
import { cn } from '@/lib/utils';

const BANK_OPTIONS = [
  { value: '', label: 'Auto-detect' },
  { value: 'sbi', label: 'SBI' },
  { value: 'hdfc', label: 'HDFC' },
  { value: 'icici', label: 'ICICI' },
  { value: 'axis', label: 'Axis' },
  { value: 'bob', label: 'Bank of Baroda' },
  { value: 'kotak', label: 'Kotak' },
  { value: 'yes', label: 'YES Bank' },
];

export interface DocumentImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFile: File | null;
  fileError: string | null;
  isParsingFile: boolean;
  parseProgress: number;
  pdfPassword: string;
  selectedBank: string;
  isDragging: boolean;
  onPdfPasswordChange: (value: string) => void;
  onSelectedBankChange: (value: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onParse: () => void;
}

export function DocumentImportSheet({
  open,
  onOpenChange,
  selectedFile,
  fileError,
  isParsingFile,
  parseProgress,
  pdfPassword,
  selectedBank,
  isDragging,
  onPdfPasswordChange,
  onSelectedBankChange,
  onFileSelect,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onParse,
}: DocumentImportSheetProps) {
  const parseFooter = (
    <MotionButton
      className="w-full"
      onClick={(e) => {
        e.preventDefault();
        onParse();
      }}
      disabled={!selectedFile || isParsingFile}
    >
      {isParsingFile ? (
        <>
          <RefreshCw className="mr-2 size-4 animate-spin" />
          Parsing…
        </>
      ) : (
        <>
          <FileText className="mr-2 size-4" />
          Parse file
        </>
      )}
    </MotionButton>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import statement"
      description="PDF, Excel, or CSV — duplicates are skipped on import."
      mobileHeight="medium"
      maxWidth="lg"
      footer={parseFooter}
    >
      <div className="space-y-4 pb-2">
        <details className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted">
          <summary className="cursor-pointer font-medium text-foreground">
            Supported formats
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-0.5 pl-1">
            <li>PDF bank statements</li>
            <li>Excel (.xls, .xlsx)</li>
            <li>Text / CSV</li>
          </ul>
        </details>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Select file</label>
          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'rounded-lg border-2 border-dashed p-4 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
            )}
          >
            <Upload className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="mb-2 text-xs text-muted-foreground">
              {isDragging ? 'Drop file here' : 'Drag & drop or tap to browse'}
            </p>
            <input
              type="file"
              accept=".pdf,.xls,.xlsx,.txt,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
              onChange={onFileSelect}
              className="hidden"
              id="file-upload-transactions"
            />
            <motion.label
              htmlFor="file-upload-transactions"
              className="inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              whileTap={getWhileTap()}
            >
              Choose file
            </motion.label>
          </div>
          {selectedFile ? (
            <p className="mt-2 truncate text-xs text-[var(--success)]">Selected: {selectedFile.name}</p>
          ) : null}
        </div>

        {fileError ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3">
            <AlertCircle className="size-4 shrink-0 text-destructive" />
            <span className="text-xs text-destructive">{fileError}</span>
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">PDF password (if any)</label>
            <Input
              type="password"
              placeholder="Enter password"
              value={pdfPassword}
              onChange={(e) => onPdfPasswordChange(e.target.value)}
              className="h-9 bg-background"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Bank (optional)</label>
            <Combobox
              options={BANK_OPTIONS}
              value={selectedBank}
              onValueChange={(value) => onSelectedBankChange(value || '')}
              placeholder="Auto-detect"
              searchPlaceholder="Search banks…"
            />
          </div>
        </div>

        {isParsingFile && parseProgress > 0 ? (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${parseProgress}%` }}
              />
            </div>
            <p className="text-center text-[10px] text-muted-foreground">Parsing… {parseProgress}%</p>
          </div>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
