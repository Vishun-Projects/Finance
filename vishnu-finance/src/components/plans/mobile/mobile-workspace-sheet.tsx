"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PlanFilterOption, TabKey } from "@/hooks/use-plans-insights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SheetClose } from "@/components/ui/sheet";
import { X } from "lucide-react";

interface MobileWorkspaceSheetProps {
  open: boolean;
  activeWorkspace: TabKey | null;
  planFilterOptions: PlanFilterOption[];
  tabSummaries: Record<TabKey, string>;
  onOpenChange: (open: boolean) => void;
  onWorkspaceSelect: (value: TabKey) => void;
  renderContent: (tab: TabKey) => React.ReactNode;
}

export function MobileWorkspaceSheet({
  open,
  activeWorkspace,
  planFilterOptions,
  tabSummaries,
  onOpenChange,
  onWorkspaceSelect,
  renderContent,
}: MobileWorkspaceSheetProps) {
  const activeOption = planFilterOptions.find(
    (option) => option.value === activeWorkspace,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mt-12 flex h-[85vh] flex-col rounded-t-3xl border-none bg-background px-0 pb-0 pt-3 sm:h-[80vh] sm:px-0"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
        <SheetHeader className="px-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-left">
              <SheetTitle className="text-lg font-semibold text-foreground">
                {activeOption ? activeOption.label : "Plans workspace"}
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs">
                {activeOption ? activeOption.helper : "Review and update your plans."}
              </SheetDescription>
            </div>
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide text-primary">
              Mobile
            </Badge>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {planFilterOptions.map((option) => {
              const Icon = option.icon;
              const isActive = option.value === activeWorkspace;
              return (
                <Button
                  key={`sheet-${option.value}`}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "flex min-w-[128px] flex-1 items-center justify-between gap-2 rounded-full px-3",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onWorkspaceSelect(option.value)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs font-semibold">
                    {option.label}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {tabSummaries[option.value]}
                  </span>
                </Button>
              );
            })}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {activeWorkspace ? renderContent(activeWorkspace) : null}
        </div>

        <div className="flex items-center justify-center border-t border-border/60 px-4 py-3">
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex w-full items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

