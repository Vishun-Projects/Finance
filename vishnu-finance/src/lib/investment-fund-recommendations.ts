import {
  getInvestmentsOverview,
  type InvestmentActivityRow,
} from './investments-overview-service';
import {
  searchMutualFunds,
  getSchemeNav,
  type MfSchemeSummary,
} from './mfdata-client';

export interface RankedMfScheme extends MfSchemeSummary {
  matchScore: number;
  matchReasons: string[];
  /** 1–5 fit score derived from matchScore — not a Morningstar/Value Research rating */
  matchRating: number;
  matchPercent: number;
  topMatch?: boolean;
}

function scoreToRating(score: number): { matchRating: number; matchPercent: number } {
  const matchPercent = Math.min(100, Math.round((Math.max(0, score) / 75) * 100));
  const matchRating =
    matchPercent >= 85 ? 5 : matchPercent >= 65 ? 4 : matchPercent >= 45 ? 3 : matchPercent >= 25 ? 2 : 1;
  return { matchRating, matchPercent };
}

const DEFAULT_SEARCHES = [
  { query: 'nifty 50 index direct growth', label: 'Index investing' },
  { query: 'flexi cap direct growth', label: 'Diversified equity' },
  { query: 'elss direct growth', label: 'Tax-saving (80C)' },
] as const;

const THEME_MAP = [
  {
    theme: 'nifty',
    patterns: /nifty|nifty50|index fund|sensex/i,
    searchQuery: 'nifty 50 index direct growth',
    label: 'Index funds',
  },
  {
    theme: 'elss',
    patterns: /elss|tax saver|80c|tax saving/i,
    searchQuery: 'elss direct growth',
    label: 'ELSS',
  },
  {
    theme: 'largecap',
    patterns: /large cap|bluechip|largecap/i,
    searchQuery: 'large cap direct growth',
    label: 'Large cap',
  },
  {
    theme: 'midcap',
    patterns: /mid cap|midcap/i,
    searchQuery: 'mid cap direct growth',
    label: 'Mid cap',
  },
  {
    theme: 'flexi',
    patterns: /flexi|multi cap|multicap/i,
    searchQuery: 'flexi cap direct growth',
    label: 'Flexi cap',
  },
  {
    theme: 'debt',
    patterns: /debt|liquid|ultra short/i,
    searchQuery: 'liquid fund direct growth',
    label: 'Debt / liquid',
  },
  {
    theme: 'smallcap',
    patterns: /small cap|smallcap/i,
    searchQuery: 'small cap direct growth',
    label: 'Small cap',
  },
] as const;

const RESEARCH_DISCLAIMER =
  'Matched to your activity for research only — not investment advice.';

function extractThemes(activity: InvestmentActivityRow[]) {
  const found = new Map<string, { searchQuery: string; label: string }>();
  for (const row of activity) {
    for (const t of THEME_MAP) {
      if (t.patterns.test(row.label)) {
        found.set(t.theme, { searchQuery: t.searchQuery, label: t.label });
      }
    }
  }
  return [...found.entries()].map(([theme, meta]) => ({ theme, ...meta }));
}

function scoreScheme(
  name: string,
  userThemes: Set<string>,
  searchQuery: string,
): { score: number; reasons: string[] } {
  const lower = name.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  const seen = new Set<string>();

  const addReason = (reason: string, points: number) => {
    score += points;
    if (!seen.has(reason)) {
      seen.add(reason);
      reasons.push(reason);
    }
  };

  if (lower.includes('direct') && lower.includes('growth')) {
    addReason('Direct Growth plan', 25);
  } else if (lower.includes('direct')) {
    addReason('Direct plan', 12);
  }

  if (lower.includes('index') || lower.includes('nifty') || lower.includes('sensex')) {
    addReason('Index fund', 12);
  }

  for (const theme of userThemes) {
    const map = THEME_MAP.find((t) => t.theme === theme);
    if (map?.patterns.test(lower)) {
      addReason(`Matches your ${map.label.toLowerCase()} activity`, 45);
    }
  }

  const tokens = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2 && !['direct', 'growth', 'plan'].includes(t));
  for (const token of tokens) {
    if (lower.includes(token)) score += 6;
  }

  if (lower.includes('idcw') || (lower.includes('dividend') && !lower.includes('direct'))) {
    score -= 18;
  }
  if (lower.includes('regular plan') || (lower.includes('regular') && !lower.includes('direct'))) {
    score -= 12;
  }

  return { score, reasons };
}

function dedupeSchemes(schemes: MfSchemeSummary[]): MfSchemeSummary[] {
  const seen = new Set<string>();
  return schemes.filter((s) => {
    if (seen.has(s.scheme_code)) return false;
    seen.add(s.scheme_code);
    return true;
  });
}

async function enrichWithNav(
  schemes: RankedMfScheme[],
  limit = 8,
): Promise<RankedMfScheme[]> {
  const navs = await Promise.all(
    schemes.slice(0, limit).map((s) => getSchemeNav(s.scheme_code)),
  );
  return schemes.map((s, i) =>
    i < limit && navs[i] != null ? { ...s, nav: navs[i]! } : s,
  );
}

function rankSchemes(
  schemes: MfSchemeSummary[],
  userThemes: Set<string>,
  searchQuery: string,
  limit: number,
): RankedMfScheme[] {
  const ranked = schemes
    .map((s) => {
      const { score, reasons } = scoreScheme(s.scheme_name, userThemes, searchQuery);
      const rating = scoreToRating(score);
      return { ...s, matchScore: score, matchReasons: reasons, ...rating };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  if (ranked.length > 0 && ranked[0].matchScore > 0) {
    return ranked.map((s, i) => (i === 0 ? { ...s, topMatch: true } : s));
  }

  return ranked;
}

export async function getPersonalizedFundSuggestions(userId: string) {
  const overview = await getInvestmentsOverview(userId);
  const themes = extractThemes(overview.activity);
  const userThemeSet = new Set(themes.map((t) => t.theme));

  const searchPlans =
    themes.length > 0
      ? themes.map((t) => ({ query: t.searchQuery, label: t.label }))
      : DEFAULT_SEARCHES.map((s) => ({ query: s.query, label: s.label }));

  const batches = await Promise.all(
    searchPlans.slice(0, 4).map((plan) => searchMutualFunds(plan.query)),
  );

  const allSchemes = dedupeSchemes(batches.flat());
  const primaryQuery = searchPlans[0]?.query ?? DEFAULT_SEARCHES[0].query;
  const ranked = rankSchemes(allSchemes, userThemeSet, primaryQuery, 12);
  const schemes = await enrichWithNav(ranked);

  return {
    schemes,
    basedOn:
      themes.length > 0
        ? themes.map((t) => t.label)
        : DEFAULT_SEARCHES.map((s) => s.label),
    activityCount: overview.activity.length,
    mode: 'suggestions' as const,
    disclaimer: RESEARCH_DISCLAIMER,
  };
}

export async function searchFundsForUser(userId: string, query: string) {
  const overview = await getInvestmentsOverview(userId);
  const themes = extractThemes(overview.activity);
  const userThemeSet = new Set(themes.map((t) => t.theme));

  const results = await searchMutualFunds(query);
  const ranked = rankSchemes(results, userThemeSet, query, 25);
  const schemes = await enrichWithNav(ranked, 10);

  return {
    schemes,
    query,
    basedOn: themes.map((t) => t.label),
    mode: 'search' as const,
    disclaimer: RESEARCH_DISCLAIMER,
  };
}
