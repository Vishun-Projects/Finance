'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getWhileTap, prefersReducedMotion } from '@/lib/motion-utils';
import { hapticLight } from '@/lib/haptics';
import { trackFabOpened } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

type NativeFabProps = Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'title' | 'aria-label'>;

interface FabButtonProps extends NativeFabProps {
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function FabButton({ label, icon, className, onClick, type = 'button', disabled, title, 'aria-label': ariaLabel }: FabButtonProps) {
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const { user } = useAuth();
  const reducedMotion = prefersReducedMotion();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Create ripple effect
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setRipple({ x, y });
    setTimeout(() => setRipple(null), 600);
    
    // Trigger haptic feedback
    hapticLight();
    
    // Track analytics
    trackFabOpened(user?.id);
    
    // Call original onClick
    onClick?.(e);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center md:hidden"
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
    >
      <motion.button
        type={type}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel || label || 'Primary Action'}
        className={cn(
          'pointer-events-auto inline-flex items-center gap-3 rounded-full bg-primary text-primary-foreground shadow-xl',
          'px-5 py-3 text-sm font-semibold btn-touch relative overflow-hidden',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'hover:bg-primary/90 transition-transform',
          className
        )}
        whileTap={reducedMotion ? {} : getWhileTap()}
        onClick={handleClick}
      >
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground">
            {icon}
          </span>
        )}
        {label && <span className="pr-1">{label}</span>}
        {/* Ripple effect */}
        {ripple && !reducedMotion && (
          <motion.span
            className="pointer-events-none absolute rounded-full bg-white/30"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 0,
              height: 0,
            }}
            animate={{
              width: 240,
              height: 240,
              x: -120,
              y: -120,
              opacity: [0.45, 0],
            }}
            transition={{
              duration: 0.6,
              ease: 'easeOut',
            }}
          />
        )}
      </motion.button>
    </div>
  );
}


