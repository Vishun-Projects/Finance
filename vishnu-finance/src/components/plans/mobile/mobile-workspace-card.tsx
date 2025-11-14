"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MobileWorkspaceCardData } from "@/hooks/use-plans-insights";
import { ArrowRight } from "lucide-react";

interface MobileWorkspaceCardProps {
  data: MobileWorkspaceCardData;
  onOpen: () => void;
}

export function MobileWorkspaceCard({ data, onOpen }: MobileWorkspaceCardProps) {
  const Icon = data.icon;

  return (
    <Card className="border border-border/60 bg-card/95 shadow-sm dark:border-border/40 dark:bg-background/80">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <CardTitle className="text-base font-semibold text-foreground">{data.title}</CardTitle>
          </div>
          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide text-primary">
            Focus
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Quickly review progress and jump into the workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {data.metrics.map((metric) => (
            <div
              key={`${data.value}-${metric.label}`}
              className="rounded-xl border border-border/50 bg-background/95 p-3 text-left shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </p>
              <p className="text-lg font-semibold text-foreground">{metric.value}</p>
              {metric.helper ? (
                <p className="text-[11px] text-muted-foreground">{metric.helper}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/95 p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Focus item</p>
          <p className="mt-1 text-sm font-medium text-foreground">{data.highlight.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{data.highlight.description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between rounded-full border-border/60 font-semibold"
          onClick={onOpen}
        >
          {data.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

