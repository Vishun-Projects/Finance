'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';
import type { MobileSheetHeight } from '@/lib/motion-utils';
import { mobileSheetHeightClasses } from '@/lib/motion-utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Max width on desktop */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Mobile bottom sheet height tier */
  mobileHeight?: MobileSheetHeight;
}

const maxWidthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  full: 'sm:max-w-[min(100%,72rem)]',
};

function SheetGrabber() {
  return (
    <div className="flex shrink-0 justify-center pt-3 pb-1">
      <div className="h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
    </div>
  );
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  maxWidth = 'lg',
  mobileHeight = 'medium',
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile('lg');

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            patterns.bottomSheetBase,
            mobileSheetHeightClasses[mobileHeight],
            'w-full rounded-t-2xl p-0 sm:max-w-none',
            className,
            contentClassName
          )}
        >
          <SheetGrabber />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
            {(title || description) && (
              <SheetHeader className="px-0 pt-2 text-left">
                {title && <SheetTitle>{title}</SheetTitle>}
                {description && <SheetDescription>{description}</SheetDescription>}
              </SheetHeader>
            )}
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && <SheetFooter className="mt-4 shrink-0 border-t border-border pt-4 px-0">{footer}</SheetFooter>}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidthClasses[maxWidth], 'max-h-[90vh] overflow-y-auto', contentClassName)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
