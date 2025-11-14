'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { prefersReducedMotion, TIMING, EASING } from '@/lib/motion-utils';

interface FilterSheetProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function FilterSheet({ open, title = 'Filters', onClose, children }: FilterSheetProps) {
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
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : TIMING.MEDIUM / 1000, ease: EASING.EASE_OUT }}
            onClick={onClose}
            aria-hidden
          />
          
          {/* Sheet */}
          <motion.div
            className="absolute left-0 right-0 bottom-0 bg-background border-t rounded-t-xl shadow-strong safe-bottom"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reducedMotion ? { y: '100%' } : { y: '100%', opacity: 0 }}
            animate={reducedMotion ? { y: 0 } : { y: 0, opacity: 1 }}
            exit={reducedMotion ? { y: '100%' } : { y: '100%', opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : TIMING.MEDIUM / 1000,
              ease: EASING.EASE_OUT,
            }}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold">{title}</h3>
              <button 
                className="text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" 
                onClick={onClose} 
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


