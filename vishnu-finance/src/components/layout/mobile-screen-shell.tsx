'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import MobilePageHeader from '@/components/layout/mobile-page-header';
import FabButton from '@/components/ui/fab-button';
import { useScrollOwner } from '@/contexts/scroll-owner-context';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { getPageEnterVariants, prefersReducedMotion } from '@/lib/motion-utils';
import { cn } from '@/lib/utils';

export interface MobileScreenShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  fullBleed?: boolean;
  noTopOffset?: boolean;
  fab?: {
    label?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
  };
  /** Pull-to-refresh callback — omit when route has no handler */
  onRefresh?: () => void | Promise<void>;
  /** Whether a refresh handler is registered for the active route */
  refreshEnabled?: boolean;
  tableScrollShell?: boolean;
  className?: string;
}

export function MobileScreenShell({
  children,
  title,
  subtitle,
  headerRight,
  fullBleed = false,
  noTopOffset = false,
  fab,
  onRefresh,
  refreshEnabled = false,
  tableScrollShell = false,
  className,
}: MobileScreenShellProps) {
  const isMobile = useIsMobile('lg');
  const scrollOwner = useScrollOwner();
  const [pullDistance, setPullDistance] = useState(0);
  const pullDistanceRef = useRef(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const ptrActive = refreshEnabled && Boolean(onRefresh);

  const handleRefresh = useCallback(async () => {
    if (!ptrActive || !onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [ptrActive, onRefresh, isRefreshing]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!ptrActive) return;
    if ((scrollOwner?.getScrollTop() ?? 0) > 0) return;
    touchStartY.current = e.touches[0]?.clientY ?? 0;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || !ptrActive) return;
    const y = e.touches[0]?.clientY ?? 0;
    const delta = Math.max(0, Math.min(80, y - touchStartY.current));
    pullDistanceRef.current = delta;
    setPullDistance(delta);
  };

  const onTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistanceRef.current >= 56) {
      void handleRefresh();
    } else {
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  const reducedMotion = prefersReducedMotion();
  const pageVariants = useMemo(() => getPageEnterVariants(), []);
  const ptrIndicatorTop = noTopOffset || tableScrollShell ? 'top-2' : 'top-14';

  return (
    <motion.div
      className={cn(
        'relative flex min-h-full flex-col lg:contents',
        tableScrollShell && 'max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-hidden',
        !fullBleed && !tableScrollShell && cn('w-full px-4 lg:px-10 lg:py-8 py-4'),
        tableScrollShell && 'max-lg:w-full max-lg:px-4 max-lg:py-0',
        !noTopOffset && !tableScrollShell && 'pt-14',
        tableScrollShell && !noTopOffset && 'max-lg:pt-14',
        'lg:pt-0',
        className,
      )}
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={pageVariants}
      transition={reducedMotion ? { duration: 0 } : undefined}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {ptrActive && (pullDistance > 0 || isRefreshing) ? (
        <div
          className={cn('pointer-events-none absolute inset-x-0 z-20 flex justify-center', ptrIndicatorTop)}
          style={{ transform: `translateY(${Math.min(pullDistance, 48)}px)` }}
        >
          <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            {isRefreshing ? 'Refreshing…' : pullDistance >= 56 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      ) : null}

      {title ? (
        <MobilePageHeader title={title} subtitle={subtitle} right={headerRight} />
      ) : null}

      <div className={cn('flex-1', fullBleed && 'w-full', tableScrollShell && 'max-lg:min-h-0 max-lg:flex max-lg:flex-col')}>
        {children}
      </div>

      {fab ? (
        <FabButton
          label={fab.label}
          icon={fab.icon}
          onClick={fab.onClick}
          aria-label={fab['aria-label'] ?? fab.label}
        />
      ) : null}
    </motion.div>
  );
}
