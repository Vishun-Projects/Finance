const MFAPI_BASE = 'https://api.mfapi.in/mf';
const SEARCH_TIMEOUT_MS = 10_000;

export interface MfSchemeSummary {
  scheme_code: string;
  scheme_name: string;
  amc?: string;
  category?: string;
  nav?: number;
}

interface MfApiSearchHit {
  schemeCode: number | string;
  schemeName: string;
}

export async function searchMutualFunds(query: string): Promise<MfSchemeSummary[]> {
  const q = query.trim();
  if (!q) return [];

  const res = await fetch(`${MFAPI_BASE}/search?q=${encodeURIComponent(q)}`, {
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`MF search failed (${res.status})`);
  }

  const data = (await res.json()) as MfApiSearchHit[];
  if (!Array.isArray(data)) return [];

  return data.slice(0, 25).map((item) => ({
    scheme_code: String(item.schemeCode),
    scheme_name: item.schemeName,
  }));
}

export async function getSchemeNav(schemeCode: string): Promise<number | null> {
  const res = await fetch(`${MFAPI_BASE}/${encodeURIComponent(schemeCode)}/latest`, {
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: Array<{ nav?: string }> };
  const nav = data.data?.[0]?.nav;
  return nav ? Number(nav) : null;
}
