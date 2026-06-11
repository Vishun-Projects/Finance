'use client';

import * as React from 'react';
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

type SheetSide = 'top' | 'bottom' | 'left' | 'right';

interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Side on desktop (md+). Mobile always uses bottom. */
  desktopSide?: Exclude<SheetSide, 'top' | 'bottom'>;
  className?: string;
  contentClassName?: string;
  showGrabber?: boolean;
  mobileHeight?: MobileSheetHeight;
}

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  desktopSide = 'right',
  className,
  contentClassName,
  showGrabber = true,
  mobileHeight = 'medium',
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile('lg');
  const side: SheetSide = isMobile ? 'bottom' : desktopSide;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          isMobile && patterns.bottomSheetBase,
          isMobile && mobileSheetHeightClasses[mobileHeight],
          isMobile && 'w-full rounded-t-2xl p-0 sm:max-w-none',
          !isMobile && desktopSide === 'right' && 'sm:max-w-md md:max-w-lg',
          !isMobile && desktopSide === 'left' && 'sm:max-w-sm',
          className,
          contentClassName
        )}
      >
        {isMobile && showGrabber && (
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          </div>
        )}
        <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', isMobile && 'px-4 pb-4')}>
          {(title || description) && (
            <SheetHeader className={cn(isMobile && 'px-0 pt-2 text-left')}>
              {title && <SheetTitle>{title}</SheetTitle>}
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
          )}
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && (
            <SheetFooter className={cn('mt-4 shrink-0 border-t border-border pt-4', isMobile && 'px-0')}>
              {footer}
            </SheetFooter>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
