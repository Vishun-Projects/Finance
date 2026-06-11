'use client';



import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { patterns } from '@/design/patterns';

import { hapticLight } from '@/lib/haptics';

import {

  SETTINGS_SECTIONS,

  LEGAL_DOC_ITEMS,

  LEGAL_SUPPORT_ITEMS,

  type SettingsSectionId,

  type LegalDocHref,

} from '@/features/settings/components/settings-nav-config';



type SettingsDesktopLayoutProps = {

  activeSection: string;

  activeLegalDoc: LegalDocHref | null;

  onSectionChange: (id: SettingsSectionId) => void;

  onLegalDocChange: (href: LegalDocHref) => void;

  children: React.ReactNode;

};



export function SettingsDesktopLayout({

  activeSection,

  activeLegalDoc,

  onSectionChange,

  onLegalDocChange,

  children,

}: SettingsDesktopLayoutProps) {

  return (

    <div className="hidden lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">

      <aside className="space-y-6">

        <div>

          <h1 className="text-xl font-semibold text-foreground">Settings</h1>

          <p className="mt-1 text-sm text-muted-foreground">Account and preferences</p>

        </div>



        <nav aria-label="Settings sections">

          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-hint">

            Preferences

          </p>

          <div className="overflow-hidden rounded-xl border border-border bg-card">

            {SETTINGS_SECTIONS.map((section, index) => {

              const Icon = section.icon;

              const isActive = !activeLegalDoc && activeSection === section.id;

              return (

                <button

                  key={section.id}

                  type="button"

                  onClick={() => {

                    void hapticLight();

                    onSectionChange(section.id);

                  }}

                  className={cn(

                    patterns.mobileCompactRow,

                    'btn-touch flex w-full items-center gap-3 text-left transition-colors',

                    index > 0 && 'border-t border-border',

                    isActive ? 'bg-surface text-foreground' : 'text-muted-foreground hover:bg-surface/60'

                  )}

                >

                  <Icon className="size-4 shrink-0" />

                  <span className="min-w-0 flex-1 text-sm font-medium">{section.label}</span>

                  {isActive && (

                    <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />

                  )}

                </button>

              );

            })}

          </div>

        </nav>



        <div>

          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-hint">

            Legal &amp; Support

          </p>

          <div className="overflow-hidden rounded-xl border border-border bg-card">

            {LEGAL_DOC_ITEMS.map((item, index) => {

              const isActive = activeLegalDoc === item.href;

              return (

                <button

                  key={item.id}

                  type="button"

                  onClick={() => {

                    void hapticLight();

                    onLegalDocChange(item.href);

                  }}

                  className={cn(

                    patterns.mobileCompactRow,

                    'btn-touch flex w-full items-center gap-3 text-left text-sm transition-colors',

                    index > 0 && 'border-t border-border',

                    isActive

                      ? 'bg-surface text-foreground'

                      : 'text-muted-foreground hover:bg-surface/60'

                  )}

                >

                  <span className="min-w-0 flex-1 font-medium">{item.label}</span>

                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />

                </button>

              );

            })}

            {LEGAL_SUPPORT_ITEMS.map((item) => {

              const Icon = item.icon;

              return (

                <Link

                  key={item.id}

                  href={item.href}

                  className={cn(

                    patterns.mobileCompactRow,

                    'btn-touch flex items-center gap-3 text-sm text-foreground transition-colors hover:bg-surface',

                    'border-t border-border'

                  )}

                  onClick={() => void hapticLight()}

                >

                  <Icon className="size-4 shrink-0 text-muted-foreground" />

                  <span className="min-w-0 flex-1">

                    <span className="block font-medium">{item.label}</span>

                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">

                      {item.description}

                    </span>

                  </span>

                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />

                </Link>

              );

            })}

          </div>

        </div>

      </aside>



      <div className="min-w-0">{children}</div>

    </div>

  );

}


