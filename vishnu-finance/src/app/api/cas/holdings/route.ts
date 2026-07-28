import { withAuth } from '@/lib/api-auth';
import { getLatestCasUpload } from '@/lib/cas-persistence';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, user) => {
  try {
    const latest = await getLatestCasUpload(user.id);
    if (!latest) {
      return NextResponse.json({ upload: null });
    }

    return NextResponse.json({
      upload: {
        id: latest.id,
        fileName: latest.fileName,
        isLikelyCas: latest.isLikelyCas,
        folioCount: latest.folioCount,
        holderName: latest.holderName,
        statementDate: latest.statementDate,
        registrar: latest.registrar,
        parseWarning: latest.parseWarning,
        totalValue: latest.totalValue ? Number(latest.totalValue) : undefined,
        createdAt: latest.createdAt.toISOString(),
        holdings: latest.holdings.map((h) => ({
          schemeName: h.schemeName,
          folio: h.folio,
          units: h.units != null ? Number(h.units) : undefined,
          nav: h.nav != null ? Number(h.nav) : undefined,
          value: h.value != null ? Number(h.value) : undefined,
          isin: h.isin,
        })),
      },
    });
  } catch (error) {
    console.error('[cas/holdings] load failed', { userId: user.id, error });
    return NextResponse.json({ upload: null });
  }
});
