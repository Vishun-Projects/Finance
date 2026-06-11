'use client';

import { LayoutGrid, Layers, ReceiptText } from 'lucide-react';
import { NavPill, NavPillGroup } from '@/components/ui/nav-pill';
import { hapticLight } from '@/lib/haptics';

export type DashboardMobileView = 'overview' | 'plans' | 'activity';

const TABS: { id: DashboardMobileView; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'plans', label: 'Plans', icon: Layers },
  { id: 'activity', label: 'Activity', icon: ReceiptText },
];

interface DashboardSegmentedNavProps {
  active: DashboardMobileView;
  onChange: (view: DashboardMobileView) => void;
  className?: string;
}

export function DashboardSegmentedNav({ active, onChange, className }: DashboardSegmentedNavProps) {
  return (
    <NavPillGroup variant="segmented" className={className}>
      {TABS.map(({ id, label, icon: Icon }) => (
        <NavPill
          key={id}
          label={label}
          icon={<Icon className="size-4" />}
          active={active === id}
          variant="segmented"
          onClick={() => {
            void hapticLight();
            onChange(id);
          }}
        />
      ))}
    </NavPillGroup>
  );
}
