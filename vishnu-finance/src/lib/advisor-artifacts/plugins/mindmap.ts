import { mapCategoryToBucket } from '@/features/dashboard/config/category-bucket-map';
import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';
import type { TransactionDetail } from '@/lib/financial-analysis';
import type { IncomeBudgetBucketDto } from '@/lib/income-budget-service';
import type {
  ArtifactPlugin,
  AdvisorArtifact,
  MindmapNode,
} from '@/lib/advisor-artifacts/types';

const MINDMAP_RE =
  /\b(mind\s*-?\s*map|mindmap|hierarchy|tree\s*view|breakdown\s*map|as\s+a\s+tree|interactive\s+tree)\b/i;

export function detectMindmapRequest(query: string): boolean {
  return MINDMAP_RE.test(query);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function merchantLabel(tx: TransactionDetail): string {
  return (
    tx.store?.trim() ||
    tx.personName?.trim() ||
    (tx.description || '').trim().slice(0, 40) ||
    'Unknown'
  );
}

export function buildMindmapArtifact(args: {
  transactions: TransactionDetail[];
  budgetBuckets: IncomeBudgetBucketDto[];
  entityLabel?: string;
}): Extract<AdvisorArtifact, { kind: 'mindmap' }> | null {
  const { transactions, budgetBuckets } = args;
  const expenses = transactions.filter((t) => t.type === 'EXPENSE');
  if (expenses.length === 0 && budgetBuckets.length === 0) return null;

  type CatAgg = { amount: number; merchants: Map<string, number> };
  type BucketAgg = { label: string; amount: number; categories: Map<string, CatAgg> };

  const bucketMap = new Map<string, BucketAgg>();

  const ensureBucket = (key: string, label: string): BucketAgg => {
    let b = bucketMap.get(key);
    if (!b) {
      b = { label, amount: 0, categories: new Map() };
      bucketMap.set(key, b);
    }
    return b;
  };

  // Seed from plan so empty buckets still appear
  for (const bucket of budgetBuckets) {
    ensureBucket(bucket.key, bucket.label);
  }

  for (const tx of expenses) {
    const catName = tx.category?.name || 'Uncategorized';
    const breakdown = mapCategoryToBucket(catName) as BreakdownCategory;
    const planBucket =
      budgetBuckets.find((b) => b.mapFrom.includes(breakdown)) ||
      budgetBuckets.find((b) => b.label.toLowerCase() === breakdown.toLowerCase());
    const key = planBucket?.key || breakdown || 'other';
    const label = planBucket?.label || breakdown || 'Other';
    const bucket = ensureBucket(key, label);
    bucket.amount += tx.amount;

    let cat = bucket.categories.get(catName);
    if (!cat) {
      cat = { amount: 0, merchants: new Map() };
      bucket.categories.set(catName, cat);
    }
    cat.amount += tx.amount;
    const m = merchantLabel(tx);
    cat.merchants.set(m, (cat.merchants.get(m) || 0) + tx.amount);
  }

  const children: MindmapNode[] = [...bucketMap.entries()]
    .map(([key, bucket]) => {
      const catNodes: MindmapNode[] = [...bucket.categories.entries()]
        .map(([catLabel, cat]) => {
          const merchants = [...cat.merchants.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, amount]) => ({
              id: `${key}:${catLabel}:${label}`,
              label,
              amount: round2(amount),
            }));
          return {
            id: `${key}:${catLabel}`,
            label: catLabel,
            amount: round2(cat.amount),
            children: merchants.length > 0 ? merchants : undefined,
          };
        })
        .sort((a, b) => (b.amount || 0) - (a.amount || 0));

      return {
        id: key,
        label: bucket.label,
        amount: round2(bucket.amount),
        children: catNodes.length > 0 ? catNodes : undefined,
      };
    })
    .sort((a, b) => (b.amount || 0) - (a.amount || 0));

  const total = round2(children.reduce((s, n) => s + (n.amount || 0), 0));
  const title = args.entityLabel
    ? `Spend mindmap — ${args.entityLabel}`
    : 'Budget & spend mindmap';

  return {
    kind: 'mindmap',
    title,
    payload: {
      root: {
        id: 'root',
        label: 'Spending',
        amount: total,
        children,
      },
    },
  };
}

export function formatMindmapContextForPrompt(
  artifact: Extract<AdvisorArtifact, { kind: 'mindmap' }>,
): string {
  const root = artifact.payload.root;
  const lines: string[] = [];
  for (const bucket of root.children || []) {
    lines.push(
      `- ${bucket.label}: ${bucket.amount ?? 0} (${(bucket.children || []).length} categories)`,
    );
    for (const cat of (bucket.children || []).slice(0, 4)) {
      lines.push(`  - ${cat.label}: ${cat.amount ?? 0}`);
    }
  }

  return [
    '=== MINDMAP RENDERED BY THE APP ===',
    'The UI shows an interactive expandable mindmap (plan buckets → categories → merchants). NEVER say you cannot show a mindmap.',
    `title: ${artifact.title}`,
    `root_total: ${root.amount ?? 0}`,
    'structure:',
    ...lines.slice(0, 40),
    'Summarize how spend flows across buckets and top categories. Do not invent ASCII trees.',
    '=== END MINDMAP ===',
  ].join('\n');
}

export const mindmapArtifactPlugin: ArtifactPlugin<'mindmap'> = {
  kind: 'mindmap',
  detect: detectMindmapRequest,
  build: (ctx) =>
    buildMindmapArtifact({
      transactions: ctx.transactions,
      budgetBuckets: ctx.budgetBuckets,
      entityLabel: ctx.entityLabel,
    }),
  promptHint: formatMindmapContextForPrompt,
};
