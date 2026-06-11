'use client';

import { navPillVariants, segmentedNavPillVariants } from '@/design/variants';
import { getWhileTap, prefersReducedMotion } from '@/lib/motion-utils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type NavPillVariant = 'pill' | 'segmented';

const NavPillGroupContext = createContext<(() => void) | null>(null);

interface NavPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  variant?: NavPillVariant;
}

export function NavPill({
  label,
  active,
  onClick,
  icon,
  className,
  variant = 'pill',
}: NavPillProps) {
  const variants = variant === 'segmented' ? segmentedNavPillVariants : navPillVariants;
  const updateIndicator = useContext(NavPillGroupContext);

  useLayoutEffect(() => {
    updateIndicator?.();
  }, [active, updateIndicator]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      data-nav-active={active ? 'true' : 'false'}
      whileTap={getWhileTap()}
      className={cn(
        variants({ active }),
        variant === 'segmented' && active && 'font-semibold',
        'relative z-10',
        className,
      )}
    >
      {icon}
      {label}
    </motion.button>
  );
}

interface NavPillGroupProps {
  children: ReactNode;
  className?: string;
  variant?: NavPillVariant;
}

export function NavPillGroup({ children, className, variant = 'pill' }: NavPillGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const active = container.querySelector<HTMLElement>('[data-nav-active="true"]');
    if (!active) {
      setIndicator((prev) => ({ ...prev, ready: false }));
      return;
    }

    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
      ready: true,
    });
  }, []);

  useLayoutEffect(() => {
    updateIndicator();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => updateIndicator());
    ro.observe(container);
    for (const child of container.children) {
      if (child instanceof HTMLElement && child.dataset.navIndicator !== 'true') {
        ro.observe(child);
      }
    }

    return () => ro.disconnect();
  }, [updateIndicator, children]);

  const reducedMotion = prefersReducedMotion();
  const transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.85 };

  if (variant === 'segmented') {
    return (
      <NavPillGroupContext.Provider value={updateIndicator}>
        <div
          ref={containerRef}
          className={cn(
            'relative flex justify-center gap-1 overflow-x-auto border-b border-border/60',
            className,
          )}
          role="tablist"
        >
          {indicator.ready ? (
            <motion.div
              data-nav-indicator="true"
              aria-hidden
              className="pointer-events-none absolute bottom-0 z-0 h-0.5 rounded-full bg-foreground"
              initial={false}
              animate={{ left: indicator.left, width: indicator.width }}
              transition={transition}
            />
          ) : null}
          {children}
        </div>
      </NavPillGroupContext.Provider>
    );
  }

  return (
    <NavPillGroupContext.Provider value={updateIndicator}>
      <div
        ref={containerRef}
        className={cn(
          'relative flex gap-0.5 overflow-x-auto rounded-[13px] p-1 glass-thin glass-text',
          className,
        )}
      >
        {indicator.ready ? (
          <motion.div
            data-nav-indicator="true"
            aria-hidden
            className="pointer-events-none absolute top-1 bottom-1 z-0 rounded-[var(--radius-pill)] border border-accent bg-accent"
            initial={false}
            animate={{ left: indicator.left, width: indicator.width }}
            transition={transition}
          />
        ) : null}
        {children}
      </div>
    </NavPillGroupContext.Provider>
  );
}
