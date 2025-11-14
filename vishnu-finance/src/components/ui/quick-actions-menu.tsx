"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarPlus,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { hapticLight } from "@/lib/haptics";
import { prefersReducedMotion } from "@/lib/motion-utils";
import { cn } from "@/lib/utils";

import { Button } from "./button";

export type QuickActionTone = "primary" | "emerald" | "red" | "blue" | "neutral";

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  description?: string;
  badge?: string;
  href?: string;
  onSelect?: () => void;
  tone?: QuickActionTone;
}

export interface QuickActionsMenuProps {
  actions?: QuickAction[];
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  closeOnSelect?: boolean;
  trigger?: {
    closed?: ReactNode;
    open?: ReactNode;
  };
  className?: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    icon: TrendingUp,
    label: "Add income",
    description: "Log a new earning",
    href: "/income",
    tone: "emerald",
  },
  {
    icon: TrendingDown,
    label: "Add expense",
    description: "Capture a spend quickly",
    href: "/expenses",
    tone: "red",
  },
  {
    icon: Target,
    label: "Set goal",
    description: "Track a savings target",
    href: "/goals",
    tone: "blue",
  },
  {
    icon: CalendarPlus,
    label: "Add deadline",
    description: "Schedule an upcoming payment",
    href: "/deadlines",
    tone: "neutral",
  },
];

const positionClasses = {
  "bottom-right": "bottom-24 right-4",
  "bottom-left": "bottom-24 left-4",
  "top-right": "top-20 right-4",
  "top-left": "top-20 left-4",
} as const;

const toneClasses: Record<QuickActionTone, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
  red: "bg-red-600 text-white hover:bg-red-700",
  blue: "bg-blue-600 text-white hover:bg-blue-700",
  neutral: "bg-card text-foreground border border-border/60 hover:bg-card/90",
};

export function QuickActionsMenu({
  actions = DEFAULT_ACTIONS,
  position = "bottom-right",
  closeOnSelect = true,
  trigger,
  className,
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const reducedMotion = prefersReducedMotion();

  const handleToggle = () => {
    hapticLight();
    setIsOpen((prev) => !prev);
  };

  const handleActionSelect = (action: QuickAction) => {
    hapticLight();
    action.onSelect?.();
    if (closeOnSelect) {
      setIsOpen(false);
    }
  };

  const triggerIcons = {
    closed: trigger?.closed ?? <Plus className="h-5 w-5" />,
    open: trigger?.open ?? <X className="h-5 w-5" />,
  };

  const renderActionButton = (action: QuickAction) => {
    const content = (
      <div className="flex w-full items-center gap-3 text-left">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/20 text-primary-foreground/90">
          <action.icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <span className="block text-sm font-semibold leading-tight">
            {action.label}
          </span>
          {action.description ? (
            <span className="mt-0.5 block text-xs opacity-80">
              {action.description}
            </span>
          ) : null}
        </div>
        {action.badge ? (
          <span className="rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {action.badge}
          </span>
        ) : null}
      </div>
    );

    const tone = action.tone ?? "primary";
    const classNames = cn(
      "w-full justify-start gap-3 text-left shadow-lg transition-transform hover:translate-y-[-2px]",
      toneClasses[tone],
    );

    if (action.href) {
      return (
        <Button
          key={action.href}
          asChild
          variant="default"
          size="sm"
          className={classNames}
        >
          <Link href={action.href} onClick={() => handleActionSelect(action)}>
            {content}
          </Link>
        </Button>
      );
    }

    return (
      <Button
        key={action.label}
        variant="default"
        size="sm"
        className={classNames}
        onClick={() => handleActionSelect(action)}
      >
        {content}
      </Button>
    );
  };

  return (
    <div className={cn("pointer-events-auto fixed z-40", positionClasses[position], className)}>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="actions"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 18 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 12 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            className="mb-3 flex w-[220px] flex-col gap-2 md:w-[240px]"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.href ?? action.label}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 18 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                transition={{
                  delay: reducedMotion ? 0 : index * 0.05,
                  duration: reducedMotion ? 0 : 0.15,
                }}
              >
                {renderActionButton(action)}
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        onClick={handleToggle}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "hover:bg-primary/90 transition-colors",
        )}
        whileTap={reducedMotion ? {} : { scale: 0.95 }}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        aria-expanded={isOpen}
        type="button"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isOpen ? "open" : "closed"}
            initial={{ rotate: isOpen ? -90 : 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: isOpen ? 90 : -90, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
          >
            {isOpen ? triggerIcons.open : triggerIcons.closed}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

export default QuickActionsMenu;
