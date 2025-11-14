"use client";

import { TabKey } from "@/hooks/use-plans-insights";
import QuickActionsMenu, { QuickAction } from "@/components/ui/quick-actions-menu";
import { CalendarPlus, PlusCircle, Target } from "lucide-react";

interface MobileActionMenuProps {
  onOpenWorkspace: (tab: TabKey) => void;
}

export function MobileActionMenu({ onOpenWorkspace }: MobileActionMenuProps) {
  const actions: QuickAction[] = [
    {
      icon: Target,
      label: "Add goal",
      description: "Set a new savings target",
      tone: "primary",
      onSelect: () => onOpenWorkspace("goals"),
    },
    {
      icon: CalendarPlus,
      label: "Schedule deadline",
      description: "Plan an upcoming payment",
      tone: "blue",
      onSelect: () => onOpenWorkspace("deadlines"),
    },
    {
      icon: PlusCircle,
      label: "Add wishlist item",
      description: "Prioritise a future purchase",
      tone: "emerald",
      onSelect: () => onOpenWorkspace("wishlist"),
    },
  ];

  return <QuickActionsMenu actions={actions} position="bottom-right" />;
}

