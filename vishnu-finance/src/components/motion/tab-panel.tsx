'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { getTabPanelVariants } from '@/lib/motion-utils';
import { cn } from '@/lib/utils';
import { useMemo, type ReactNode } from 'react';

interface TabPanelTransitionProps {
  panelKey: string;
  children: ReactNode;
  className?: string;
}

export function TabPanelTransition({ panelKey, children, className }: TabPanelTransitionProps) {
  const variants = useMemo(() => getTabPanelVariants(), []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={panelKey}
        className={cn(className)}
        variants={variants}
        initial={false}
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
