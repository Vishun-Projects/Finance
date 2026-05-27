'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';

export interface ResponsiveDataColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  /** Show in mobile card header row */
  mobilePrimary?: boolean;
  /** Hide on mobile card */
  hideOnMobile?: boolean;
  className?: string;
  headerClassName?: string;
}

interface ResponsiveDataViewProps<T> {
  columns: ResponsiveDataColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  emptyMessage?: React.ReactNode;
  tableClassName?: string;
  cardClassName?: string;
  onRowClick?: (row: T, index: number) => void;
  mobileActions?: (row: T, index: number) => React.ReactNode;
}

export function ResponsiveDataView<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No data',
  tableClassName,
  cardClassName,
  onRowClick,
  mobileActions,
}: ResponsiveDataViewProps<T>) {
  const primaryColumns = columns.filter((c) => c.mobilePrimary);
  const mobileColumns = columns.filter((c) => !c.hideOnMobile && !c.mobilePrimary);

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <>
      <div className={cn('hidden overflow-x-auto md:block', tableClassName)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className={cn('px-3 py-2 font-medium', col.headerClassName)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={cn(
                  'border-b border-border/60 last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-muted/50'
                )}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-3 py-2.5', col.className)}>
                    {col.cell(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cn(patterns.mobileCardList, cardClassName)}>
        {rows.map((row, index) => (
          <div
            key={getRowKey(row, index)}
            className={cn(
              'card-base p-3',
              onRowClick && 'cursor-pointer active:bg-muted/50'
            )}
            onClick={onRowClick ? () => onRowClick(row, index) : undefined}
          >
            {primaryColumns.length > 0 && (
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {primaryColumns.map((col) => (
                    <div key={col.key}>{col.cell(row, index)}</div>
                  ))}
                </div>
                {mobileActions?.(row, index)}
              </div>
            )}
            <dl className="space-y-1.5">
              {mobileColumns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-2 text-sm">
                  <dt className="shrink-0 text-muted-foreground">{col.header}</dt>
                  <dd className={cn('min-w-0 text-right', col.className)}>{col.cell(row, index)}</dd>
                </div>
              ))}
            </dl>
            {!primaryColumns.length && mobileActions && (
              <div className="mt-2 flex justify-end">{mobileActions(row, index)}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
