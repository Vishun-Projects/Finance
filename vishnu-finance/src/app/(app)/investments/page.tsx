import { format } from 'date-fns';
import { requireUser } from '@/lib/auth/server-auth';
import { getLatestCasUpload } from '@/lib/cas-persistence';
import { getInvestmentsOverview } from '@/lib/investments-overview-service';
import InvestmentsPage from '@/features/investments/components/investments-page';
import type { InitialCasUpload } from '@/features/investments/types';
import type { InvestmentsOverview } from '@/lib/investments-overview-service';

export default async function InvestmentsRoutePage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  let initialOverview: InvestmentsOverview | null = null;
  let initialCasUpload: InitialCasUpload | null = null;

  try {
    const [overview, latestCas] = await Promise.all([
      getInvestmentsOverview(user.id),
      getLatestCasUpload(user.id).catch(() => null),
    ]);
    initialOverview = overview;

    if (latestCas) {
      initialCasUpload = {
        fileName: latestCas.fileName,
        message: `Saved upload from ${format(new Date(latestCas.createdAt), 'd MMM yyyy')}`,
        isLikelyCas: latestCas.isLikelyCas,
        folioCount: latestCas.folioCount,
        holderName: latestCas.holderName ?? undefined,
        pan: latestCas.pan ?? undefined,
        statementDate: latestCas.statementDate ?? undefined,
        registrar: latestCas.registrar ?? undefined,
        holdings: latestCas.holdings.map((h) => ({
          schemeName: h.schemeName,
          folio: h.folio ?? undefined,
          units: h.units != null ? Number(h.units) : undefined,
          nav: h.nav != null ? Number(h.nav) : undefined,
          value: h.value != null ? Number(h.value) : undefined,
          isin: h.isin ?? undefined,
        })),
        totalValue: latestCas.totalValue ? Number(latestCas.totalValue) : undefined,
        parseWarning: latestCas.parseWarning ?? undefined,
        createdAt: latestCas.createdAt.toISOString(),
      };
    }
  } catch (error) {
    console.error('[investments-page] bootstrap failed', { userId: user.id, error });
  }

  return (
    <InvestmentsPage
      initialOverview={initialOverview}
      initialCasUpload={initialCasUpload}
    />
  );
}
