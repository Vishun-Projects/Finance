import type {
  AdvisorArtifact,
  ArtifactBuildContext,
  ArtifactKind,
  ArtifactPlugin,
} from '@/lib/advisor-artifacts/types';
import {
  chartArtifactPlugin,
  buildDefaultChartArtifact,
} from '@/lib/advisor-artifacts/plugins/chart';
import {
  calendarArtifactPlugin,
  buildCalendarArtifact,
} from '@/lib/advisor-artifacts/plugins/calendar';
import { mindmapArtifactPlugin } from '@/lib/advisor-artifacts/plugins/mindmap';

/** Erase per-kind generics so plugins can share one registry array. */
type RegisteredPlugin = {
  kind: ArtifactKind;
  detect: (query: string) => boolean;
  build: (ctx: ArtifactBuildContext) => AdvisorArtifact | null;
  promptHint: (artifact: AdvisorArtifact) => string;
};

function registerPlugin<K extends ArtifactKind>(plugin: ArtifactPlugin<K>): RegisteredPlugin {
  return plugin as unknown as RegisteredPlugin;
}

/** Register new interactive views here — one plugin + one UI renderer. */
export const ARTIFACT_PLUGINS: RegisteredPlugin[] = [
  registerPlugin(chartArtifactPlugin),
  registerPlugin(calendarArtifactPlugin),
  registerPlugin(mindmapArtifactPlugin),
];

const GENERIC_INTERACTIVE_RE =
  /\b(interactive|visualize|visualise|show\s+me\s+visually|visual\s+(view|breakdown)|as\s+a\s+visual)\b/i;

export function isGenericInteractiveRequest(query: string): boolean {
  return GENERIC_INTERACTIVE_RE.test(query);
}

export function wantsAnyInteractiveArtifact(query: string): boolean {
  if (isGenericInteractiveRequest(query)) return true;
  return ARTIFACT_PLUGINS.some((p) => p.detect(query));
}

function pluginByKind(kind: ArtifactKind): RegisteredPlugin | undefined {
  return ARTIFACT_PLUGINS.find((p) => p.kind === kind);
}

/**
 * Detect matching artifact kinds and build payloads from finance data.
 * Explicit kinds always win; bare “interactive” falls back to calendar (dated) or chart.
 */
export function detectAndBuildArtifacts(
  query: string,
  ctx: Omit<ArtifactBuildContext, 'query'>,
): AdvisorArtifact[] {
  const fullCtx: ArtifactBuildContext = { ...ctx, query };
  const matched = ARTIFACT_PLUGINS.filter((p) => p.detect(query));

  const artifacts: AdvisorArtifact[] = [];
  const seen = new Set<ArtifactKind>();

  for (const plugin of matched) {
    const built = plugin.build(fullCtx);
    if (built && !seen.has(built.kind)) {
      artifacts.push(built);
      seen.add(built.kind);
    }
  }

  if (artifacts.length === 0 && isGenericInteractiveRequest(query)) {
    const preferCalendar = ctx.hasDatedWindow !== false;
    if (preferCalendar) {
      const cal =
        buildCalendarArtifact({
          transactions: ctx.transactions,
          entityLabel: ctx.entityLabel,
        }) || calendarArtifactPlugin.build(fullCtx);
      if (cal) {
        artifacts.push(cal);
        seen.add('calendar');
      }
    }
    if (artifacts.length === 0) {
      const chart = buildDefaultChartArtifact({
        query,
        transactions: ctx.transactions,
        entityLabel: ctx.entityLabel,
        disciplineSummary: ctx.disciplineSummary,
        fallbackMonthlyPace: ctx.fallbackMonthlyPace,
        adherenceBuckets: ctx.adherenceBuckets,
      });
      if (chart) artifacts.push(chart);
    }
  }

  return artifacts;
}

/** Concatenate model-facing notes for all built artifacts. */
export function formatArtifactsPromptBlock(artifacts: AdvisorArtifact[]): string {
  if (artifacts.length === 0) return '';
  const parts = artifacts.map((artifact) => {
    const plugin = pluginByKind(artifact.kind);
    if (!plugin) return '';
    return plugin.promptHint(artifact);
  });
  return `\n\n${parts.filter(Boolean).join('\n\n')}`;
}

export function artifactsSystemHint(artifacts: AdvisorArtifact[]): string {
  if (artifacts.length === 0) return '';
  const kinds = artifacts.map((a) => a.kind).join(', ');
  return `\nThe app renders interactive views (${kinds}) from transaction/plan data. NEVER say you cannot show interactive calendars, charts, mindmaps, or visuals. Summarize what the UI shows; keep tables short if needed.`;
}
