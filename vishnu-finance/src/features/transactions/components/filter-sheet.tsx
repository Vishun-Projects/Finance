'use client';

import React from 'react';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { Button } from '@/components/ui/button';

interface FilterSheetProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  activeFiltersCount?: number;
  onClearFilters?: () => void;
}

export default function FilterSheet({
  open,
  title = 'Filters',
  onClose,
  children,
  activeFiltersCount,
  onClearFilters,
}: FilterSheetProps) {
  const showReset =
    activeFiltersCount !== undefined && activeFiltersCount > 0 && onClearFilters;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={title}
      mobileHeight="medium"
      desktopSide="right"
      footer={
        showReset ? (
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={onClearFilters}
          >
            Reset filters ({activeFiltersCount})
          </Button>
        ) : undefined
      }
    >
      {children}
    </ResponsiveSheet>
  );
}
