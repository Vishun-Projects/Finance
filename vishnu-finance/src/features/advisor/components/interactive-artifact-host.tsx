'use client';

import type { AdvisorArtifact } from '@/lib/advisor-artifacts/types';
import { ChartMessage } from '@/features/advisor/components/chart-message';
import { AdvisorCalendarMessage } from '@/features/advisor/components/advisor-calendar-message';
import { AdvisorMindmap } from '@/features/advisor/components/advisor-mindmap';
import { AdvisorForecastTimeline } from '@/features/advisor/components/advisor-forecast-timeline';
import { cn } from '@/lib/utils';

interface InteractiveArtifactHostProps {
  artifact: AdvisorArtifact;
  className?: string;
}

/** Renders a registered interactive artifact. Add a case when you add a plugin. */
export function InteractiveArtifactHost({
  artifact,
  className,
}: InteractiveArtifactHostProps) {
  switch (artifact.kind) {
    case 'chart':
      if (artifact.payload.timeline) {
        return (
          <AdvisorForecastTimeline
            timeline={artifact.payload.timeline}
            className={className}
          />
        );
      }
      if (artifact.payload.config) {
        return (
          <ChartMessage
            config={artifact.payload.config}
            className={className}
          />
        );
      }
      return null;
    case 'calendar':
      return (
        <AdvisorCalendarMessage
          title={artifact.title}
          payload={artifact.payload}
          className={className}
        />
      );
    case 'mindmap':
      return (
        <AdvisorMindmap
          title={artifact.title}
          payload={artifact.payload}
          className={className}
        />
      );
    default: {
      const _exhaustive: never = artifact;
      void _exhaustive;
      return null;
    }
  }
}

interface InteractiveArtifactsListProps {
  artifacts: AdvisorArtifact[];
  className?: string;
}

export function InteractiveArtifactsList({
  artifacts,
  className,
}: InteractiveArtifactsListProps) {
  if (!artifacts.length) return null;
  return (
    <div className={cn('mt-3 space-y-3', className)}>
      {artifacts.map((artifact, index) => (
        <InteractiveArtifactHost
          key={`${artifact.kind}-${artifact.title}-${index}`}
          artifact={artifact}
        />
      ))}
    </div>
  );
}

/** Hydrate artifacts from message fields or persisted sources (incl. legacy chart). */
export function hydrateArtifactsFromMessage(message: {
  artifacts?: AdvisorArtifact[];
  chartConfig?: import('@/lib/advisor-chart-types').ChartConfig;
  sources?: Array<{
    type?: string;
    kind?: string;
    title?: string;
    payload?: unknown;
    chartConfig?: import('@/lib/advisor-chart-types').ChartConfig;
  }>;
}): AdvisorArtifact[] {
  if (message.artifacts?.length) return message.artifacts;

  const fromSources: AdvisorArtifact[] = [];
  for (const s of message.sources || []) {
    if (s.type === 'interactive' && s.kind && s.payload) {
      fromSources.push({
        kind: s.kind as AdvisorArtifact['kind'],
        title: s.title || s.kind,
        payload: s.payload as AdvisorArtifact['payload'],
      } as AdvisorArtifact);
    } else if (s.type === 'chart' && (s.chartConfig || s.payload)) {
      const payload = (s.payload || {}) as {
        config?: import('@/lib/advisor-chart-types').ChartConfig;
        timeline?: unknown;
        notes?: string[];
      };
      fromSources.push({
        kind: 'chart',
        title: s.title || s.chartConfig?.title || 'Chart',
        payload: {
          config: s.chartConfig || payload.config,
          timeline: payload.timeline as never,
          notes: payload.notes,
        },
      });
    }
  }
  if (fromSources.length) return fromSources;

  if (message.chartConfig) {
    return [
      {
        kind: 'chart',
        title: message.chartConfig.title || 'Chart',
        payload: { config: message.chartConfig },
      },
    ];
  }
  return [];
}
