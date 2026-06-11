'use client';

import Link from 'next/link';
import { MobileGroupedList } from '@/components/ui/mobile-grouped-list';
import {
  SETTINGS_SECTIONS,
  LEGAL_DOC_ITEMS,
  LEGAL_SUPPORT_ITEMS,
  type LegalDocHref,
} from '@/features/settings/components/settings-nav-config';

type SettingsMobileNavProps = {
  onTabChange: (tab: string) => void;
  onLegalDocChange: (href: LegalDocHref) => void;
};

export function SettingsMobileNav({ onTabChange, onLegalDocChange }: SettingsMobileNavProps) {
  return (
    <MobileGroupedList
      sections={[
        {
          title: 'Preferences',
          items: SETTINGS_SECTIONS.map((tab) => ({
            id: tab.id,
            label: tab.label,
            description: tab.description,
            icon: <tab.icon className="size-4" />,
            onClick: () => onTabChange(tab.id),
          })),
        },
        {
          title: 'Legal & Support',
          items: [
            ...LEGAL_DOC_ITEMS.map((item) => ({
              id: item.id,
              label: item.label,
              onClick: () => onLegalDocChange(item.href),
            })),
            ...LEGAL_SUPPORT_ITEMS.map((item) => ({
              id: item.id,
              label: item.label,
              description: item.description,
              href: item.href,
              icon: <item.icon className="size-4" />,
            })),
          ],
        },
      ]}
    />
  );
}

export { getSettingsSectionLabel as getSettingsTabLabel } from '@/features/settings/components/settings-nav-config';
