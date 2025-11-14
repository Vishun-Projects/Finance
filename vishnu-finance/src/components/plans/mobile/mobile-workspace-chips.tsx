"use client";

import { useId } from "react";
import type { PlanFilterOption, TabKey } from "@/hooks/use-plans-insights";
import { cn } from "@/lib/utils";

interface MobileWorkspaceChipsProps {
  active: TabKey;
  options: PlanFilterOption[];
  onSelect: (value: TabKey) => void;
}

export function MobileWorkspaceChips({
  active,
  options,
  onSelect,
}: MobileWorkspaceChipsProps) {
  const controlId = useId();
  return (
    <div className="sticky top-16 z-30 border-b border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        aria-labelledby={controlId}
      >
        <span id={controlId} className="sr-only">
          Choose plans workspace
        </span>
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = active === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                "flex min-w-[138px] flex-1 items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [&::-webkit-scrollbar]:hidden",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
              )}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

