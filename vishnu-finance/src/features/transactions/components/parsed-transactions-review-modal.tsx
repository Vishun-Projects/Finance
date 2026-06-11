'use client';

import React from 'react';
import {
  Upload,
  RefreshCw,
  FileText,
  BrainCircuit,
  Check,
  TrendingUp,
} from 'lucide-react';
import { TabPanelTransition } from '@/components/motion/tab-panel';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { NavPill, NavPillGroup } from '@/components/ui/nav-pill';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MotionButton } from '@/components/ui/motion-button';
import { Callout } from '@/components/ui/callout';
import { Chip } from '@/components/ui/chip';
import { cn, formatRupees } from '@/lib/utils';
import { getTransactionDisplayName } from '@/lib/transaction-utils';
import type { ImportPreviewResult } from '@/lib/import-preview-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

export interface ParsedBankTransaction {
  debit?: number | string;
  credit?: number | string;
  description?: string;
  date?: string;
  date_iso?: string;
  narration?: string;
  store?: string;
  personName?: string;
  commodity?: string;
  balance?: number | string;
  upiId?: string;
  [key: string]: unknown;
}

interface ParsedTransactionsReviewModalProps {
  open: boolean;
  onClose: () => void;
  fileName?: string;
  parsingViewMode: 'transactions' | 'import-check' | 'payees' | 'raw' | 'json';
  onParsingViewModeChange: (mode: 'transactions' | 'import-check' | 'payees' | 'raw' | 'json') => void;
  parsedTransactions: ParsedBankTransaction[];
  filteredParsed: ParsedBankTransaction[];
  visibleParsed: ParsedBankTransaction[];
  statementMetadata: Record<string, unknown> | null;
  parserMethod: string;
  parseValidation: {
    valid?: boolean;
    reconciled?: boolean;
    mismatch_count?: number;
    opening_balance?: number;
    closing_balance?: number;
  } | null;
  actualTotals: { totalCredits: number; totalDebits: number };
  previewMonthOnly: boolean;
  onPreviewMonthOnlyChange: (value: boolean) => void;
  previewPage: number;
  onPreviewPageChange: (page: number) => void;
  previewPageSize: number;
  onPreviewPageSizeChange: (size: number) => void;
  totalPages: number;
  allowImportDespiteValidation: boolean;
  onAllowImportDespiteValidationChange: (value: boolean) => void;
  forceInsertOnImport: boolean;
  onForceInsertOnImportChange: (value: boolean) => void;
  updateExistingOnImport: boolean;
  onUpdateExistingOnImportChange: (value: boolean) => void;
  importPreview: ImportPreviewResult | null;
  importPreviewLoading?: boolean;
  categories?: Array<{ id: string; name: string }>;
  categoryOverrides: Record<string, string>;
  onCategoryOverrideChange: (payeeKey: string, categoryId: string) => void;
  isImporting: boolean;
  importProgress: number;
  onImport: () => void;
  formatPreviewDate: (transaction: ParsedBankTransaction) => string;
  getPreviewDescription: (transaction: ParsedBankTransaction) => string;
}

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ParsedTransactionsReviewModal({
  open,
  onClose,
  fileName,
  parsingViewMode,
  onParsingViewModeChange,
  parsedTransactions,
  filteredParsed,
  visibleParsed,
  statementMetadata,
  parserMethod,
  parseValidation,
  actualTotals,
  previewMonthOnly,
  onPreviewMonthOnlyChange,
  previewPage,
  onPreviewPageChange,
  previewPageSize,
  onPreviewPageSizeChange,
  totalPages,
  allowImportDespiteValidation,
  onAllowImportDespiteValidationChange,
  forceInsertOnImport,
  onForceInsertOnImportChange,
  updateExistingOnImport,
  onUpdateExistingOnImportChange,
  importPreview,
  importPreviewLoading,
  categories = [],
  categoryOverrides,
  onCategoryOverrideChange,
  isImporting,
  importProgress,
  onImport,
  formatPreviewDate,
  getPreviewDescription,
}: ParsedTransactionsReviewModalProps) {
  const importDisabled =
    isImporting || filteredParsed.length === 0 || (parseValidation?.valid === false && !allowImportDespiteValidation);

  const importFooter = (
    <div className="w-full space-y-3">
      {isImporting ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${importProgress}%` }} />
        </div>
      ) : null}
      <MotionButton type="button" className="w-full" disabled={importDisabled} onClick={onImport}>
        {isImporting ? (
          <>
            <RefreshCw className="mr-2 size-4 animate-spin" />
            Importing… {importProgress}%
          </>
        ) : (
          <>
            <Upload className="mr-2 size-4" />
            Import {filteredParsed.length} transactions
          </>
        )}
      </MotionButton>
      <p className="text-center text-xs text-muted-foreground">
        {importPreview
          ? `${importPreview.counts.new} new · ${importPreview.counts.duplicate} duplicates skipped unless you update existing`
          : 'Credits → Income · Debits → Expenses'}
      </p>
    </div>
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title="Review parsed transactions"
      description={
        <>
          {fileName || 'Bank statement'}
          {' · '}
          {filteredParsed.length} of {parsedTransactions.length} transactions
          {parserMethod ? ` · ${parserMethod.replace(/_/g, ' ')}` : ''}
        </>
      }
      mobileHeight="full"
      desktopSide="right"
      contentClassName="sm:max-w-[min(100%,72rem)]"
      footer={importFooter}
    >
      <div className="space-y-4 pb-2">
        <NavPillGroup className="w-full overflow-x-auto">
          {(
            [
              ['import-check', 'Import check'],
              ['payees', 'Payees'],
              ['transactions', `Txns (${filteredParsed.length})`],
              ['raw', 'Debug'],
              ['json', 'JSON'],
            ] as const
          ).map(([mode, label]) => (
            <NavPill
              key={mode}
              label={label}
              active={parsingViewMode === mode}
              onClick={() => onParsingViewModeChange(mode)}
            />
          ))}
        </NavPillGroup>

        <TabPanelTransition panelKey={parsingViewMode}>
        <div>
          {parsingViewMode === 'import-check' && (
            <div className="space-y-4">
              {importPreviewLoading && (
                <p className="text-sm text-muted-foreground">Analyzing overlaps and duplicates…</p>
              )}
              {importPreview && (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">New rows</p>
                      <p className="text-lg font-semibold text-success">{importPreview.counts.new}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Duplicates</p>
                      <p className="text-lg font-semibold text-warning">{importPreview.counts.duplicate}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">In-file dupes</p>
                      <p className="text-lg font-semibold text-muted-foreground">{importPreview.counts.inFileDuplicate}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Parsed closing</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {importPreview.balance.parsedClosing != null
                          ? formatInr(importPreview.balance.parsedClosing)
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {importPreview.statementPeriod.start && importPreview.statementPeriod.end && (
                    <Callout variant="info" title="Statement period">
                      {format(new Date(importPreview.statementPeriod.start), 'd MMM yyyy')} →{' '}
                      {format(new Date(importPreview.statementPeriod.end), 'd MMM yyyy')}
                    </Callout>
                  )}

                  {importPreview.overlap.hasOverlap && importPreview.overlap.message && (
                    <Callout variant="warning" title="Overlapping dates">
                      {importPreview.overlap.message}
                    </Callout>
                  )}

                  {importPreview.balance.parsedClosing != null &&
                    importPreview.balance.lastStoredBalance != null &&
                    Math.abs(importPreview.balance.parsedClosing - importPreview.balance.lastStoredBalance) > 1 && (
                      <Callout variant="warning" title="Balance comparison">
                        Parsed closing {formatInr(importPreview.balance.parsedClosing)} vs your current bank balance{' '}
                        {formatRupees(importPreview.balance.lastStoredBalance)}.
                      </Callout>
                    )}

                  {importPreview.duplicates.length > 0 && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <p className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium">
                        Sample duplicates ({importPreview.duplicates.length})
                      </p>
                      <ul className="max-h-40 divide-y divide-border overflow-y-auto text-xs">
                        {importPreview.duplicates.slice(0, 8).map((dup) => (
                          <li key={`${dup.existingId}-${dup.index}`} className="flex justify-between gap-2 px-3 py-2">
                            <span className="truncate text-muted-foreground">
                              {dup.date} · {dup.description.slice(0, 40)}
                            </span>
                            <span className="shrink-0 tabular-nums">{formatInr(dup.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {parseValidation?.valid === false && (
                <Callout variant="warning" title="Balance mismatch">
                  Parsed totals may not fully match running balances. Review before importing.
                </Callout>
              )}

              <div className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowImportDespiteValidation}
                    onChange={(e) => onAllowImportDespiteValidationChange(e.target.checked)}
                  />
                  Import despite balance mismatch
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExistingOnImport}
                    onChange={(e) => onUpdateExistingOnImportChange(e.target.checked)}
                  />
                  Update existing duplicate rows (otherwise skip duplicates)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={forceInsertOnImport}
                    onChange={(e) => onForceInsertOnImportChange(e.target.checked)}
                  />
                  Force re-insert all rows (advanced — skips duplicate detection)
                </label>
              </div>
            </div>
          )}

          {parsingViewMode === 'payees' && (
            <div className="space-y-3">
              {!importPreview?.payees.length ? (
                <p className="text-sm text-muted-foreground">No payees detected in this import.</p>
              ) : (
                importPreview.payees.map((payee) => (
                  <div key={payee.key} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{payee.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {payee.occurrences} txn(s) ·{' '}
                          {payee.bucket === 'new'
                            ? 'New payee'
                            : payee.bucket === 'conflict'
                              ? 'Category conflict'
                              : 'Known payee'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {payee.bucket}
                      </Badge>
                    </div>
                    {payee.bucket === 'conflict' && payee.categories && (
                      <p className="mb-2 text-xs text-muted-foreground">
                        Existing:{' '}
                        {payee.categories
                          .map((c) => `${c.categoryName} (${c.count})`)
                          .join(' · ')}
                      </p>
                    )}
                    {(payee.bucket === 'new' || payee.bucket === 'conflict') && (
                      <Select
                        value={categoryOverrides[payee.key] || payee.suggestedCategoryId || ''}
                        onValueChange={(value) => onCategoryOverrideChange(payee.key, value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {payee.bucket === 'known' && payee.suggestedCategoryName && (
                      <p className="text-xs text-muted-foreground">
                        Will use {payee.suggestedCategoryName}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {parsingViewMode === 'transactions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Total credits</p>
                  <p className="text-lg font-semibold text-success">{formatInr(actualTotals.totalCredits)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Total debits</p>
                  <p className="text-lg font-semibold text-danger">{formatInr(actualTotals.totalDebits)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-lg font-semibold text-foreground">{filteredParsed.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Reconciliation</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {parseValidation?.reconciled ? (
                      <Badge className="bg-success/15 text-success border-success/30">Balanced</Badge>
                    ) : (
                      <Badge className="bg-warning/15 text-warning border-warning/30">Check balances</Badge>
                    )}
                    {parseValidation?.valid === false && (
                      <Badge className="bg-danger/15 text-danger border-danger/30">
                        {parseValidation.mismatch_count ?? 0} mismatch
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {parseValidation?.valid === false && parsingViewMode === 'transactions' && (
                <Callout variant="warning" title="Balance mismatch">
                  Parsed totals may not fully match running balances. Review the Import check tab before importing.
                </Callout>
              )}

              {statementMetadata && (
                <details className="rounded-lg border border-border bg-muted/20">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
                    Account & statement details
                  </summary>
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    {Boolean(statementMetadata.accountNumber) && (
                      <div>
                        <p className="text-xs text-muted-foreground">Account</p>
                        <p className="font-mono">{String(statementMetadata.accountNumber)}</p>
                      </div>
                    )}
                    {Boolean(statementMetadata.accountHolderName) && (
                      <div>
                        <p className="text-xs text-muted-foreground">Holder</p>
                        <p>{String(statementMetadata.accountHolderName)}</p>
                      </div>
                    )}
                    {statementMetadata.statementStartDate != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Period start</p>
                        <p>{String(statementMetadata.statementStartDate).slice(0, 10)}</p>
                      </div>
                    )}
                    {statementMetadata.statementEndDate != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Period end</p>
                        <p>{String(statementMetadata.statementEndDate).slice(0, 10)}</p>
                      </div>
                    )}
                    {statementMetadata.openingBalance != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Opening balance</p>
                        <p>{formatInr(Number(statementMetadata.openingBalance))}</p>
                      </div>
                    )}
                    {statementMetadata.closingBalance != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Closing balance</p>
                        <p>{formatInr(Number(statementMetadata.closingBalance))}</p>
                      </div>
                    )}
                    {Boolean(statementMetadata.ifsc) && (
                      <div>
                        <p className="text-xs text-muted-foreground">IFSC</p>
                        <p className="font-mono">{String(statementMetadata.ifsc)}</p>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={previewMonthOnly}
                    onChange={(e) => {
                      onPreviewMonthOnlyChange(e.target.checked);
                      onPreviewPageChange(1);
                    }}
                  />
                  Current month only
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Rows</span>
                  <select
                    value={previewPageSize}
                    onChange={(e) => {
                      onPreviewPageSizeChange(parseInt(e.target.value || '200', 10));
                      onPreviewPageChange(1);
                    }}
                    className="border rounded-md px-2 py-1 bg-background text-foreground text-sm"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>

              <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Payee</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Credit</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Debit</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleParsed.map((transaction, index) => {
                      const debitAmount = parseFloat(String(transaction.debit || '0'));
                      const creditAmount = parseFloat(String(transaction.credit || '0'));
                      const balance = transaction.balance != null ? parseFloat(String(transaction.balance)) : null;
                      const description = getPreviewDescription(transaction);
                      const payee = getTransactionDisplayName({
                        description,
                        store: transaction.store,
                        personName: transaction.personName,
                      });

                      return (
                        <tr key={`${previewPage}-${index}`} className="hover:bg-muted/40 align-top">
                          <td className="px-3 py-2.5 whitespace-nowrap text-foreground">{formatPreviewDate(transaction)}</td>
                          <td className="px-3 py-2.5 text-foreground max-w-md">
                            <p className="line-clamp-2" title={description}>{description}</p>
                            {transaction.upiId ? (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{String(transaction.upiId)}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-foreground">{payee}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-success whitespace-nowrap">
                            {creditAmount > 0 ? formatInr(creditAmount) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-danger whitespace-nowrap">
                            {debitAmount > 0 ? formatInr(debitAmount) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                            {balance != null && !Number.isNaN(balance) ? formatInr(balance) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-border border border-border rounded-lg overflow-hidden">
                {visibleParsed.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No transactions in this view</div>
                ) : (
                  visibleParsed.map((transaction, index) => {
                    const debitAmount = parseFloat(String(transaction.debit || '0'));
                    const creditAmount = parseFloat(String(transaction.credit || '0'));
                    const isIncome = creditAmount > 0;
                    const description = getPreviewDescription(transaction);
                    const payee = getTransactionDisplayName({
                      description,
                      store: transaction.store,
                      personName: transaction.personName,
                    });

                    return (
                      <div key={`${previewPage}-m-${index}`} className="p-4 bg-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">{formatPreviewDate(transaction)}</p>
                            <p className="text-sm font-medium text-foreground mt-1 line-clamp-2">{description}</p>
                            {payee ? <p className="text-xs text-muted-foreground mt-1">{payee}</p> : null}
                            <div className="mt-2">
                              <Chip variant={isIncome ? 'success' : 'danger'}>{isIncome ? 'Credit' : 'Debit'}</Chip>
                            </div>
                          </div>
                          <p className={cn('text-sm font-semibold shrink-0', isIncome ? 'text-success' : 'text-danger')}>
                            {isIncome ? formatInr(creditAmount) : formatInr(debitAmount)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {previewPage} of {totalPages} · showing {visibleParsed.length} rows
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPreviewPageChange(Math.max(1, previewPage - 1))}
                      disabled={previewPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPreviewPageChange(Math.min(totalPages, previewPage + 1))}
                      disabled={previewPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {parsingViewMode === 'raw' && (
            <div className="space-y-4">
              <Callout variant="info" title="Developer view">
                Pipeline extraction samples for debugging parse quality. Use the Transactions tab to review imports.
              </Callout>
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Raw PDF rows (sample)
                </h4>
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  {(statementMetadata?.raw_rows_sample as string[] | undefined)?.length ? (
                    (statementMetadata?.raw_rows_sample as string[]).map((row, i) => (
                      <div key={i} className="px-3 py-2 text-xs font-mono border-b border-border last:border-0 hover:bg-muted/30">
                        <span className="text-muted-foreground mr-2">{i + 1}.</span>
                        {row}
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">No raw row samples available.</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Parsed candidates (sample)
                </h4>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-2 py-2 text-left">#</th>
                        <th className="px-2 py-2 text-left">Date</th>
                        <th className="px-2 py-2 text-left">Description</th>
                        <th className="px-2 py-2 text-right">Debit</th>
                        <th className="px-2 py-2 text-right">Credit</th>
                        <th className="px-2 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {((statementMetadata?.raw_candidates as Record<string, unknown>[]) || []).slice(0, 50).map((can, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{String(can.raw_date || '—')}</td>
                          <td className="px-2 py-2 max-w-xs truncate" title={String(can.raw_description || '')}>
                            {String(can.raw_description || '—')}
                          </td>
                          <td className="px-2 py-2 text-right">{can.debit != null ? String(can.debit) : '—'}</td>
                          <td className="px-2 py-2 text-right">{can.credit != null ? String(can.credit) : '—'}</td>
                          <td className="px-2 py-2 text-right">{can.balance != null ? String(can.balance) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {parsingViewMode === 'json' && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" />
                Full pipeline output
              </h4>
              <pre className="bg-muted/30 border rounded-lg p-4 max-h-[55vh] overflow-auto text-xs font-mono">
                {JSON.stringify({ metadata: statementMetadata, transactions: parsedTransactions }, null, 2)}
              </pre>
            </div>
          )}
        </div>
        </TabPanelTransition>
      </div>
    </ResponsiveSheet>
  );
}
