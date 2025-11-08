'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getWhileTap, prefersReducedMotion } from '@/lib/motion-utils';
import { hapticLight } from '@/lib/haptics';
import { trackFabOpened } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

interface FabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
}

export default function FabButton({ label, icon, className, onClick, ...props }: FabButtonProps) {
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
    <div className="fab md:hidden">
      <motion.button
        aria-label={label || 'Primary Action'}
        className={cn(
          'fab-btn bg-primary text-primary-foreground hover:bg-primary/90 btn-touch',
          'relative overflow-hidden shadow-lg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          className
        )}
        whileTap={reducedMotion ? {} : getWhileTap()}
        onClick={handleClick}
        {...props}
      >
        {icon}
        {/* Ripple effect */}
        {ripple && !reducedMotion && (
          <motion.span
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 0,
              height: 0,
            }}
            animate={{
              width: 200,
              height: 200,
              x: -100,
              y: -100,
              opacity: [0.5, 0],
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


