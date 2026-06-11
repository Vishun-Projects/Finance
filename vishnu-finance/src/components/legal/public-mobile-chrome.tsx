'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { legalConfig } from '@/lib/legal-config';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PolicyNavList, getPublicPageTitle } from '@/components/legal/policy-nav-list';

export function PublicMobileChrome() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageTitle = getPublicPageTitle(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl lg:hidden safe-top">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/about"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
          aria-label={`${legalConfig.brandName} home`}
        >
          <div className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-card">
            <Image
              src="/icon-removebg-preview.png"
              alt=""
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
        </Link>

        <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-foreground">
          {pageTitle}
        </p>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-lg border-border"
              aria-label="Open policy menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[min(320px,85vw)] max-w-[320px] flex-col gap-0 p-0 safe-top safe-bottom sm:max-w-[320px]"
          >
            <SheetHeader className="border-b border-border px-5 py-5 text-left">
              <SheetTitle className="flex items-center gap-2.5 text-base font-semibold">
                <div className="flex size-9 items-center justify-center rounded-lg border border-border/80 bg-card">
                  <Image
                    src="/icon-removebg-preview.png"
                    alt=""
                    width={22}
                    height={22}
                    className="object-contain"
                  />
                </div>
                {legalConfig.brandName}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">Legal &amp; information</p>
            </SheetHeader>

            <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
              <PolicyNavList onNavigate={() => setOpen(false)} />
            </div>

            <div className="border-t border-border p-4">
              <Button asChild className="w-full rounded-lg" onClick={() => setOpen(false)}>
                <Link href="/auth?tab=login">Sign in</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
