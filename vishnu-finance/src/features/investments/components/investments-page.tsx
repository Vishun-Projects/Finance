'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Upload,
  Calculator,
  LineChart,
  Info,
  Wallet,
  TrendingUp,
  ArrowRight,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { NavPill, NavPillGroup } from '@/components/ui/nav-pill';
import { Callout } from '@/components/ui/callout';
import { patterns } from '@/design/patterns';
import { cn, formatCompactRupees, formatRupees } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';

type TabId = 'overview' | 'research' | 'retirement' | 'cas';
type AmountFormat = 'compact' | 'exact';

const AMOUNT_FORMAT_KEY = 'investmentsAmountFormat:v1';

interface InvestmentsOverview {
  summary: {
    investedThisYear: number;
    avgMonthlySip: number;
    investmentTransactionCount: number;
    manualInvestmentAssets: number;
    lastInvestmentDate: string | null;
  };
  activity: Array<{
    label: string;
    totalAmount: number;
    transactionCount: number;
    lastDate: string;
    source: 'bank_txn' | 'manual_asset';
  }>;
  hasData: boolean;
}

interface RankedScheme {
  scheme_code: string;
  scheme_name: string;
  nav?: number;
  matchScore: number;
  matchReasons: string[];
  matchRating?: number;
  matchPercent?: number;
  topMatch?: boolean;
}

interface CasHolding {
  schemeName: string;
  folio?: string;
  units?: number;
  nav?: number;
  value?: number;
  isin?: string;
}

interface CasUploadResult {
  fileName: string;
  message: string;
  isLikelyCas: boolean;
  folioCount?: number;
  holderName?: string;
  pan?: string;
  statementDate?: string;
  registrar?: string;
  holdings: CasHolding[];
  totalValue?: number;
  parseWarning?: string;
  createdAt?: string;
}

interface ResearchResponse {
  schemes: RankedScheme[];
  basedOn?: string[];
  mode?: 'suggestions' | 'search';
  query?: string;
  disclaimer?: string;
}

interface RetirementForm {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlySip: number;
  expectedAnnualReturn: number;
}

const defaultRetirement: RetirementForm = {
  currentAge: 30,
  retirementAge: 60,
  currentSavings: 500000,
  monthlySip: 15000,
  expectedAnnualReturn: 12,
};

const RETIREMENT_FIELDS: Array<{
  key: keyof RetirementForm;
  label: string;
  hint?: string;
}> = [
  { key: 'currentAge', label: 'Your age today' },
  { key: 'retirementAge', label: 'Plan to retire at age' },
  { key: 'currentSavings', label: 'Current investments (₹)', hint: 'Mutual funds, PPF, EPF, etc.' },
  { key: 'monthlySip', label: 'Monthly SIP (₹)' },
  { key: 'expectedAnnualReturn', label: 'Expected return (% per year)', hint: 'Illustrative only — e.g. 12' },
];

function useAmountFormat() {
  const [format, setFormat] = useState<AmountFormat>('compact');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AMOUNT_FORMAT_KEY);
      if (stored === 'exact' || stored === 'compact') setFormat(stored);
    } catch {
      /* private browsing */
    }
  }, []);

  const setAmountFormat = (next: AmountFormat) => {
    setFormat(next);
    try {
      localStorage.setItem(AMOUNT_FORMAT_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const fmt = useCallback(
    (amount: number) => (format === 'compact' ? formatCompactRupees(amount) : formatRupees(amount)),
    [format],
  );

  return { format, setAmountFormat, fmt };
}

function MatchRating({ rating, percent }: { rating: number; percent?: number }) {
  return (
    <div className="flex items-center gap-1.5" title="Fit score based on your activity — not a fund quality rating">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              'size-3',
              i <= rating ? 'fill-amber-400 text-amber-400' : 'text-border',
            )}
          />
        ))}
      </div>
      {percent != null ? (
        <span className="text-[10px] text-muted tabular-nums">{percent}% fit</span>
      ) : null}
    </div>
  );
}

function FundSchemeList({
  schemes,
  fmt,
  emptyMessage,
}: {
  schemes: RankedScheme[];
  fmt: (n: number) => string;
  emptyMessage: string;
}) {
  if (schemes.length === 0) {
    return <p className="text-sm text-muted py-4">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {schemes.map((s) => (
        <li key={s.scheme_code} className="px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{s.scheme_name}</p>
                {s.topMatch ? (
                  <span className="glass-chip glass-text shrink-0 px-2 py-0.5 text-[10px] font-medium">
                    Top match for you
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted">Code {s.scheme_code}</p>
              {s.matchRating != null ? (
                <div className="mt-1.5">
                  <MatchRating rating={s.matchRating} percent={s.matchPercent} />
                </div>
              ) : null}
              {s.matchReasons.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.matchReasons.slice(0, 3).map((r) => (
                    <span
                      key={r}
                      className="glass-chip glass-text px-1.5 py-0.5 text-[10px]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {s.nav != null ? (
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wide text-hint">Latest NAV</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">{fmt(s.nav)}</p>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function InvestmentsPage() {
  const { success, error: showError } = useToast();
  const { format: amountFormat, setAmountFormat, fmt } = useAmountFormat();
  const [tab, setTab] = useState<TabId>('overview');
  const [overview, setOverview] = useState<InvestmentsOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [mfQuery, setMfQuery] = useState('');
  const [mfResults, setMfResults] = useState<RankedScheme[]>([]);
  const [mfBasedOn, setMfBasedOn] = useState<string[]>([]);
  const [mfMode, setMfMode] = useState<'suggestions' | 'search'>('suggestions');
  const [mfLoading, setMfLoading] = useState(false);
  const [casUploading, setCasUploading] = useState(false);
  const [casUploadStatus, setCasUploadStatus] = useState<string | null>(null);
  const [casResult, setCasResult] = useState<CasUploadResult | null>(null);
  const [retirement, setRetirement] = useState(defaultRetirement);
  const [projection, setProjection] = useState<{
    yearsToRetirement: number;
    projectedTotal: number;
    totalContributions: number;
    totalGrowth: number;
  } | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await fetch('/api/investments/overview');
      if (!res.ok) throw new Error('Failed to load');
      setOverview(await res.json());
    } catch {
      showError('Investments', 'Could not load your investment activity');
    } finally {
      setOverviewLoading(false);
    }
  }, [showError]);

  const loadSuggestions = useCallback(async () => {
    setMfLoading(true);
    try {
      const res = await fetch('/api/holdings/research');
      const data = (await res.json()) as ResearchResponse;
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load funds');
      setMfResults(data.schemes ?? []);
      setMfBasedOn(data.basedOn ?? []);
      setMfMode('suggestions');
    } catch (e) {
      showError('Fund research', e instanceof Error ? e.message : 'Could not load suggestions');
      setMfResults([]);
    } finally {
      setMfLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const loadPersistedCas = useCallback(async () => {
    try {
      const res = await fetch('/api/cas/holdings');
      if (!res.ok) return;
      const data = (await res.json()) as { upload: CasUploadResult | null };
      if (!data.upload) return;
      setCasResult({
        fileName: data.upload.fileName,
        message: `Saved upload from ${format(new Date(data.upload.createdAt ?? Date.now()), 'd MMM yyyy')}`,
        isLikelyCas: data.upload.isLikelyCas,
        folioCount: data.upload.folioCount,
        holderName: data.upload.holderName,
        pan: data.upload.pan,
        statementDate: data.upload.statementDate,
        registrar: data.upload.registrar,
        holdings: data.upload.holdings ?? [],
        totalValue: data.upload.totalValue,
        parseWarning: data.upload.parseWarning,
      });
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    void loadPersistedCas();
  }, [loadPersistedCas]);

  useEffect(() => {
    if (tab === 'research') void loadSuggestions();
  }, [tab, loadSuggestions]);

  const searchMf = async () => {
    const q = mfQuery.trim();
    if (!q) {
      void loadSuggestions();
      return;
    }
    setMfLoading(true);
    try {
      const res = await fetch(`/api/holdings/research?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as ResearchResponse;
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Search failed');
      setMfResults(data.schemes ?? []);
      setMfBasedOn(data.basedOn ?? []);
      setMfMode('search');
    } catch (e) {
      showError('Search failed', e instanceof Error ? e.message : 'Try again');
      setMfResults([]);
    } finally {
      setMfLoading(false);
    }
  };

  const runRetirementSim = async (form: RetirementForm = retirement) => {
    const res = await fetch('/api/retirement-simulator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentAge: form.currentAge,
        retirementAge: form.retirementAge,
        currentCorpus: form.currentSavings,
        monthlySip: form.monthlySip,
        expectedAnnualReturn: form.expectedAnnualReturn,
      }),
    });
    if (!res.ok) {
      showError('Calculator', 'Check your ages and amounts');
      return;
    }
    const data = await res.json();
    setProjection({
      yearsToRetirement: data.projection.yearsToRetirement,
      projectedTotal: data.projection.projectedCorpus,
      totalContributions: data.projection.totalContributions,
      totalGrowth: data.projection.totalGrowth,
    });
  };

  const applyDetectedRetirementValues = () => {
    if (!overview) return;
    setRetirement((prev) => ({
      ...prev,
      monthlySip: overview.summary.avgMonthlySip || prev.monthlySip,
      currentSavings:
        overview.summary.manualInvestmentAssets || casResult?.totalValue || prev.currentSavings,
    }));
  };

  const uploadCas = async (file: File) => {
    setCasUploading(true);
    setCasUploadStatus('Reading PDF… usually 5–15s (first upload in dev can take up to ~90s while the parser compiles).');
    try {
      const form = new FormData();
      form.append('file', file);
      const controller = new AbortController();
      const clientTimeout = window.setTimeout(() => controller.abort(), 120_000);
      const res = await fetch('/api/cas/upload', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      window.clearTimeout(clientTimeout);

      const raw = await res.text();
      let data: CasUploadResult & { error?: string };
      try {
        data = JSON.parse(raw) as CasUploadResult & { error?: string };
      } catch {
        throw new Error(
          res.status >= 500
            ? 'Server error while parsing PDF. Wait ~90s on first try in dev, then upload again.'
            : 'Unexpected server response — try uploading again.',
        );
      }

      if (data.error) throw new Error(data.error);
      setCasResult(data);
      void loadPersistedCas();
      setTab('cas');
      if (data.parseWarning && !(data.holdings?.length > 0)) {
        showError('CAS parse issue', data.parseWarning);
      } else {
        success('CAS uploaded', data.message ?? 'We received your CAS PDF');
      }
      void loadOverview();
    } catch (e) {
      const message =
        e instanceof Error && e.name === 'AbortError'
          ? 'Upload timed out after 2 minutes. Try again — dev first compile is slow.'
          : e instanceof Error
            ? e.message
            : 'Could not upload file';
      showError('Upload failed', message);
    } finally {
      setCasUploading(false);
      setCasUploadStatus(null);
    }
  };

  return (
    <div className={cn(patterns.pageFluid, 'flex flex-col gap-5 pb-8')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Investments</p>
          <h1 className="text-xl font-semibold text-foreground">Your investments</h1>
          <p className="mt-1 text-sm text-muted">
            SIPs and investment payments from your bank statements — plus fund research matched to your activity.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 rounded-[13px] px-3 py-2 glass-thin glass-text">
          <span
            className={cn(
              'text-xs',
              amountFormat === 'compact' ? 'font-medium text-foreground' : 'text-muted',
            )}
          >
            Friendly
          </span>
          <Switch
            checked={amountFormat === 'exact'}
            onCheckedChange={(checked) => setAmountFormat(checked ? 'exact' : 'compact')}
            aria-label="Toggle between friendly and exact amounts"
          />
          <span
            className={cn(
              'text-xs',
              amountFormat === 'exact' ? 'font-medium text-foreground' : 'text-muted',
            )}
          >
            Exact
          </span>
        </div>
      </div>

      <NavPillGroup className="w-full max-w-2xl flex-wrap">
        <NavPill label="Your activity" active={tab === 'overview'} onClick={() => setTab('overview')} />
        <NavPill label="Fund research" active={tab === 'research'} onClick={() => setTab('research')} />
        <NavPill label="Retirement" active={tab === 'retirement'} onClick={() => setTab('retirement')} />
        <NavPill label="Import CAS" active={tab === 'cas'} onClick={() => setTab('cas')} />
      </NavPillGroup>

      {tab === 'overview' && (
        <div className="space-y-4">
          {overviewLoading && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-[var(--radius-md)] bg-surface" />
              ))}
            </div>
          )}

          {!overviewLoading && overview && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card-base p-4">
                  <p className="text-[11px] uppercase tracking-wide text-hint">Invested this year</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {fmt(overview.summary.investedThisYear)}
                  </p>
                </div>
                <div className="card-base p-4">
                  <p className="text-[11px] uppercase tracking-wide text-hint">Avg monthly (12 mo)</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {fmt(overview.summary.avgMonthlySip)}
                  </p>
                </div>
                <div className="card-base p-4">
                  <p className="text-[11px] uppercase tracking-wide text-hint">Investment payments</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {overview.summary.investmentTransactionCount}
                  </p>
                </div>
                <div className="card-base p-4">
                  <p className="text-[11px] uppercase tracking-wide text-hint">Manual assets (settings)</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {fmt(overview.summary.manualInvestmentAssets)}
                  </p>
                </div>
              </div>

              {!overview.hasData && (
                <Callout variant="neutral" title="No investment activity detected yet">
                  <p className="text-sm text-muted">
                    Import bank PDFs on Transactions so we can detect SIPs (Zerodha, Groww, CAMS, etc.), or add
                    investment assets under Settings → Net worth, or upload a CAS statement.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/transactions">Import statements</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTab('cas')}>
                      Upload CAS
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTab('research')}>
                      Browse fund research
                    </Button>
                  </div>
                </Callout>
              )}

              {overview.hasData && (
                <section className="card-base overflow-hidden">
                  <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      Where your money went
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      Grouped from your transactions
                      {overview.summary.lastInvestmentDate && (
                        <> · Last payment {format(new Date(overview.summary.lastInvestmentDate), 'd MMM yyyy')}</>
                      )}
                    </p>
                  </div>
                  <ul className="divide-y divide-border">
                    {overview.activity.map((row) => (
                      <li key={`${row.label}-${row.source}`} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{row.label}</p>
                          <p className="text-xs text-muted">
                            {row.transactionCount}×
                            {row.source === 'manual_asset' ? ' · manual entry' : ' · from bank'}
                            {' · '}
                            {format(new Date(row.lastDate), 'd MMM yyyy')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-foreground">
                            {fmt(row.totalAmount)}
                          </p>
                          {row.source === 'bank_txn' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                              <Link href={`/transactions?search=${encodeURIComponent(row.label.slice(0, 30))}`}>
                                View txns
                                <ArrowRight className="ml-1 size-3" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setTab('research')}>
                  <Search className="mr-1.5 size-3.5" />
                  Fund research
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings">
                    <Wallet className="mr-1.5 size-3.5" />
                    Net worth & assets
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/financial-health">Tax hints (80C)</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'research' && (
        <div className="space-y-4">
          <section className="card-base p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-2">
              <Search className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-medium text-foreground">Search mutual funds</h2>
                <p className="text-xs text-muted">
                  Results are ranked by fit with your detected investing activity — for research, not advice.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="h-9 border-border bg-background"
                placeholder="e.g. nifty, elss, large cap…"
                value={mfQuery}
                onChange={(e) => setMfQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void searchMf()}
              />
              <Button className="h-9 shrink-0" onClick={() => void searchMf()} disabled={mfLoading}>
                {mfLoading ? 'Loading…' : mfQuery.trim() ? 'Search' : 'Refresh picks'}
              </Button>
            </div>
          </section>

          {mfLoading && mfResults.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-[var(--radius-md)] bg-surface" />
              ))}
            </div>
          )}

          {!mfLoading || mfResults.length > 0 ? (
            <section className="card-base overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                  {mfMode === 'search' ? (
                    <>
                      <Search className="size-4 text-primary" />
                      Search results
                      {mfQuery.trim() ? (
                        <span className="font-normal text-muted">for “{mfQuery.trim()}”</span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 text-primary" />
                      Picked for you
                    </>
                  )}
                </h2>
                {mfBasedOn.length > 0 ? (
                  <p className="text-xs text-muted mt-0.5">
                    Based on: {mfBasedOn.join(', ')}
                  </p>
                ) : (
                  <p className="text-xs text-muted mt-0.5">
                    Starter categories — import statements to personalize these picks
                  </p>
                )}
              </div>
              <FundSchemeList
                schemes={mfResults}
                fmt={fmt}
                emptyMessage={
                  mfMode === 'search'
                    ? 'No funds found. Try “nifty 50”, “elss”, or “flexi cap”.'
                    : 'Could not load suggestions. Check your connection and try Refresh picks.'
                }
              />
            </section>
          ) : null}

          <div className="flex items-start gap-2 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Public fund directory (mfapi.in). Star rating = fit with your activity (not Morningstar/VR). “Top match
              for you” is not a recommendation to buy or sell.
            </span>
          </div>
        </div>
      )}

      {tab === 'retirement' && (
        <div className="space-y-4">
          <section className="card-base p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-2">
              <Calculator className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-medium text-foreground">Retirement savings estimate</h2>
                <p className="text-xs text-muted">
                  Enter your own numbers below. Use “Fill from my data” only if you want detected values applied.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {RETIREMENT_FIELDS.map(({ key, label, hint }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-foreground">{label}</Label>
                  <Input
                    type="number"
                    className="h-9 border-border bg-background text-foreground"
                    value={retirement[key]}
                    onChange={(e) =>
                      setRetirement((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                    }
                  />
                  {key === 'monthlySip' &&
                  overview?.summary.avgMonthlySip &&
                  overview.summary.avgMonthlySip !== retirement.monthlySip ? (
                    <p className="text-[10px] text-hint">
                      Detected avg from bank statements: {fmt(overview.summary.avgMonthlySip)}/mo — not applied
                      automatically.
                    </p>
                  ) : null}
                  {hint && key !== 'monthlySip' ? <p className="text-[10px] text-hint">{hint}</p> : null}
                  {hint && key === 'monthlySip' && !overview?.summary.avgMonthlySip ? (
                    <p className="text-[10px] text-hint">{hint}</p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void runRetirementSim()}>Calculate estimate</Button>
              {overview &&
              (overview.summary.avgMonthlySip > 0 || overview.summary.manualInvestmentAssets > 0) ? (
                <Button type="button" variant="outline" onClick={applyDetectedRetirementValues}>
                  Fill from my data
                </Button>
              ) : null}
            </div>
          </section>

          {projection && (
            <section className="card-base p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <LineChart className="size-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">
                  At age {retirement.retirementAge} ({projection.yearsToRetirement} years from now)
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-hint">Estimated total</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{fmt(projection.projectedTotal)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-hint">You would invest</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{fmt(projection.totalContributions)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-hint">Estimated growth</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--success)]">
                    {fmt(projection.totalGrowth)}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'cas' && (
        <div className="space-y-4">
          <section className="card-base p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-2">
              <Upload className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-medium text-foreground">Import CAS statement</h2>
                <p className="text-xs text-muted">
                  CAS = Consolidated Account Statement — a single PDF of all your mutual fund holdings from{' '}
                  <strong className="font-medium text-foreground">MF Central</strong> (mfcentral.in), CAMS, or
                  KFintech. Parsed on our server when you upload — preview only, not saved yet.
                </p>
              </div>
            </div>
            <Input
              type="file"
              accept="application/pdf"
              disabled={casUploading}
              className="border-border bg-background file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1 file:text-xs file:text-foreground"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadCas(file);
              }}
            />
            {casUploading && casUploadStatus ? (
              <p className="mt-3 text-xs text-muted animate-pulse">{casUploadStatus}</p>
            ) : null}
            <div className="mt-3 flex items-start gap-2 text-xs text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Download the latest password-free PDF from MF Central → Consolidated Account Statement. Password-protected
                or scanned PDFs often fail to parse.
              </span>
            </div>
          </section>

          {casResult && (
            <section className="card-base overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-medium text-foreground">{casResult.fileName}</h2>
                <p className="text-xs text-muted mt-0.5">{casResult.message}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
                  {casResult.isLikelyCas ? (
                    <Badge variant="secondary">Likely CAS</Badge>
                  ) : (
                    <Badge variant="outline">Not recognized as CAS</Badge>
                  )}
                  {casResult.registrar ? <span>Registrar: {casResult.registrar}</span> : null}
                  {casResult.statementDate ? <span>As on {casResult.statementDate}</span> : null}
                  {casResult.folioCount ? <span>{casResult.folioCount} folio mention(s)</span> : null}
                </div>
              </div>

              {casResult.parseWarning && (
                <div className="border-b border-border px-4 py-3">
                  <Callout variant="neutral" title="Could not read holdings">
                    <p className="text-sm text-muted">{casResult.parseWarning}</p>
                  </Callout>
                </div>
              )}

              {casResult.holdings.length > 0 ? (
                <>
                  {casResult.totalValue != null && casResult.totalValue > 0 ? (
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-hint">Parsed market value</p>
                      <p className="text-lg font-semibold tabular-nums">{fmt(casResult.totalValue)}</p>
                    </div>
                  ) : null}
                  <ul className="divide-y divide-border">
                    {casResult.holdings.map((h, i) => (
                      <li key={`${h.schemeName}-${i}`} className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{h.schemeName}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                          {h.folio ? <span>Folio {h.folio}</span> : null}
                          {h.isin ? <span>{h.isin}</span> : null}
                          {h.units != null ? <span>{h.units.toLocaleString('en-IN')} units</span> : null}
                          {h.nav != null ? <span>NAV {fmt(h.nav)}</span> : null}
                          {h.value != null ? (
                            <span className="font-medium text-foreground">{fmt(h.value)}</span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                !casResult.parseWarning && (
                  <p className="px-4 py-6 text-sm text-muted">
                    No schemes extracted. Re-export from MF Central and upload again.
                  </p>
                )
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
