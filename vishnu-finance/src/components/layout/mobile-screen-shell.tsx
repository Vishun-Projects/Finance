'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import MobilePageHeader from '@/components/layout/mobile-page-header';
import FabButton from '@/components/ui/fab-button';
import { patterns } from '@/design/patterns';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { TIMING, EASING, prefersReducedMotion } from '@/lib/motion-utils';
import { cn } from '@/lib/utils';

export interface MobileScreenShellProps {
  children: React.ReactNode;
  /** Sticky in-page header below global nav */
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  /** Skip default page padding (full-bleed pages like advisor chat) */
  fullBleed?: boolean;
  /** Hide global top bar offset — rarely needed */
  noTopOffset?: boolean;
  /** Primary FAB above bottom nav */
  fab?: {
    label?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
  };
  /** Pull-to-refresh callback */
  onRefresh?: () => void | Promise<void>;
  /** Dashboard-style: fill viewport, scroll inside page (not behind bottom nav) */
  fillViewport?: boolean;
  className?: string;
}

export function MobileScreenShell({
  children,
  title,
  subtitle,
  headerRight,
  fullBleed = false,
  noTopOffset = false,
  fillViewport = false,
  fab,
  onRefresh,
  className,
}: MobileScreenShellProps) {
  const isMobile = useIsMobile('lg');
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh, isRefreshing]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!onRefresh || !scrollRef.current) return;
    if (scrollRef.current.scrollTop > 0) return;
    touchStartY.current = e.touches[0]?.clientY ?? 0;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || !onRefresh) return;
    const y = e.touches[0]?.clientY ?? 0;
    const delta = Math.max(0, Math.min(80, y - touchStartY.current));
    setPullDistance(delta);
  };

  const onTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= 56) {
      void handleRefresh();
    } else {
      setPullDistance(0);
    }
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      key={pathname}
      ref={scrollRef}
      data-fill-viewport={fillViewport ? '' : undefined}
      className={cn(
        'relative flex min-h-full flex-col lg:contents',
        fillViewport && 'max-lg:h-dvh max-lg:max-h-dvh max-lg:overflow-hidden',
        !fullBleed && cn('w-full px-4 lg:px-10 lg:py-8', fillViewport ? 'max-lg:py-0' : 'py-4'),
        !noTopOffset && 'pt-14',
        fillViewport && 'max-lg:pb-0',
        'lg:pt-0',
        className
      )}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: TIMING.SMALL, ease: EASING.EASE_OUT }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {onRefresh && (pullDistance > 0 || isRefreshing) && (
        <div
          className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center"
          style={{ transform: `translateY(${Math.min(pullDistance, 48)}px)` }}
        >
          <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            {isRefreshing ? 'Refreshing…' : pullDistance >= 56 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}

      {title && (
        <MobilePageHeader title={title} subtitle={subtitle} right={headerRight} />
      )}

      <div
        className={cn(
          'flex-1',
          fillViewport && 'flex min-h-0 flex-col overflow-hidden',
          fullBleed && 'w-full',
        )}
      >
        {children}
      </div>

      {fab && (
        <FabButton
          label={fab.label}
          icon={fab.icon}
          onClick={fab.onClick}
          aria-label={fab['aria-label'] ?? fab.label}
        />
      )}
    </motion.div>
  );
}
