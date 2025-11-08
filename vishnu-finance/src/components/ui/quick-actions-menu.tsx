'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/motion-utils';
import { hapticLight } from '@/lib/haptics';
import Link from 'next/link';
import { Button } from './button';

interface QuickActionsMenuProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function QuickActionsMenu({ position = 'bottom-right' }: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const reducedMotion = prefersReducedMotion();

  const actions = [
    {
      icon: TrendingUp,
      label: 'Add Income',
      href: '/income',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: TrendingDown,
      label: 'Add Expense',
      href: '/expenses',
      color: 'text-red-600 dark:text-red-400',
    },
    {
      icon: Target,
      label: 'Set Goal',
      href: '/goals',
      color: 'text-blue-600 dark:text-blue-400',
    },
  ];

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
  };

  const handleToggle = () => {
    hapticLight();
    setIsOpen(!isOpen);
  };

  const handleActionClick = () => {
    hapticLight();
    setIsOpen(false);
  };

  return (
    <div className={cn('fixed z-30 md:hidden', positionClasses[position])}>
      {/* Actions Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="mb-2 space-y-2"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.href}
                initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
                animate={reducedMotion ? {} : { opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: reducedMotion ? 0 : 0.15 }}
              >
                <Link href={action.href} onClick={handleActionClick}>
                  <Button
                    variant="default"
                    size="sm"
                    className={cn(
                      'w-full justify-start gap-2 shadow-lg',
                      action.color.includes('emerald') && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                      action.color.includes('red') && 'bg-red-600 hover:bg-red-700 text-white',
                      action.color.includes('blue') && 'bg-blue-600 hover:bg-blue-700 text-white',
                    )}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={handleToggle}
        className={cn(
          'w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'hover:bg-primary/90 transition-colors'
        )}
        whileTap={reducedMotion ? {} : { scale: 0.95 }}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={isOpen}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Target className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

