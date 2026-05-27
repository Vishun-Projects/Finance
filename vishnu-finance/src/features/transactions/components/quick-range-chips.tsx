'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getWhileTap, prefersReducedMotion, TIMING, EASING } from '@/lib/motion-utils';
import { trackQuickRangeChanged } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

export type QuickRange = 'month' | 'lastMonth' | 'quarter' | 'year' | 'all' | 'custom';

interface QuickRangeChipsProps {
  value: QuickRange;
  onChange: (value: QuickRange) => void;
  className?: string;
  announceChange?: boolean; // Whether to announce changes to screen readers
}

const OPTIONS: { key: QuickRange; label: string }[] = [
  { key: 'month', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

export default function QuickRangeChips({ value, onChange, className, announceChange = true }: QuickRangeChipsProps) {
  const { user } = useAuth();
  const announcementRef = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();

  // Announce range changes to screen readers
  useEffect(() => {
    if (announceChange && announcementRef.current) {
      const selectedOption = OPTIONS.find(opt => opt.key === value);
      if (selectedOption) {
        announcementRef.current.textContent = `Date range changed to ${selectedOption.label}`;
        // Track analytics
        trackQuickRangeChanged(value, user?.id);
      }
    }
  }, [value, announceChange, user?.id]);

  const handleChange = (newValue: QuickRange) => {
    onChange(newValue);
  };

  return (
    <>
      {/* Screen reader announcement */}
      <div
        ref={announcementRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
      
      <div className={cn('flex flex-wrap gap-2', className)}>
        {OPTIONS.map(opt => {
          const isActive = value === opt.key;
          
          return (
            <motion.button
              key={opt.key}
              type="button"
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border relative overflow-hidden',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-muted'
              )}
              onClick={() => handleChange(opt.key)}
              aria-pressed={isActive}
              whileTap={reducedMotion ? {} : getWhileTap()}
              animate={{
                scale: isActive ? 1 : 1,
              }}
              transition={{
                duration: reducedMotion ? 0 : TIMING.SMALL,
                ease: EASING.EASE_OUT,
              }}
            >
              {/* Active state background fill animation */}
              {isActive && !reducedMotion && (
                <motion.div
                  className="absolute inset-0 bg-primary rounded-full"
                  layoutId="activeRange"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                />
              )}
              
              <span className="relative z-10">{opt.label}</span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}


