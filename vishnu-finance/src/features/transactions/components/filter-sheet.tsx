'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { prefersReducedMotion, TIMING, EASING } from '@/lib/motion-utils';
import { cn } from '@/lib/utils';

interface FilterSheetProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  activeFiltersCount?: number;
  onClearFilters?: () => void;
}

export default function FilterSheet({ open, title = 'Filters', onClose, children, activeFiltersCount, onClearFilters }: FilterSheetProps) {
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden
          />

          {/* Sheet/Modal */}
          <motion.div
            className={cn(
              'relative z-10 mx-auto flex w-full max-w-md flex-col bg-background shadow-2xl',
              'max-h-[min(85vh,640px)] rounded-t-2xl border border-border md:rounded-xl',
              'overflow-hidden safe-bottom'
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reducedMotion ? { y: '100%' } : { y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? { y: '100%' } : { y: '100%', opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.32, 0.72, 0, 1] // Custom ease-out
            }}
          >
            {/* Grabber for Mobile */}
            <div className="flex justify-center pt-2 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-muted/50" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-foreground">{title}</h3>
              <div className="flex items-center gap-3">
                {activeFiltersCount !== undefined && activeFiltersCount > 0 && onClearFilters && (
                  <button
                    onClick={onClearFilters}
                    className="text-xs font-medium text-destructive hover:text-destructive/80"
                  >
                    Reset ({activeFiltersCount})
                  </button>
                )}
                <button
                  className="text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded opacity-70 hover:opacity-100"
                  onClick={onClose}
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


