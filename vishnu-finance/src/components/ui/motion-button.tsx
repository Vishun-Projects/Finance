'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Button, type ButtonProps } from '@/components/ui/button';
import { getWhileTap } from '@/lib/motion-utils';
import { cn } from '@/lib/utils';

type MotionButtonProps = Omit<ButtonProps, 'asChild'>;

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, ...props }, ref) => (
    <motion.div whileTap={getWhileTap()} className="inline-flex">
      <Button ref={ref} className={cn(className)} {...props} />
    </motion.div>
  ),
);
MotionButton.displayName = 'MotionButton';
