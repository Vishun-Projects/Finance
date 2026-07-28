import { withAuth } from '@/lib/api-auth';
import { getInvestmentsOverview } from '@/lib/investments-overview-service';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, user) => {
  try {
    const overview = await getInvestmentsOverview(user.id);
    return NextResponse.json(overview);
  } catch (error) {
    console.error('[investments/overview] load failed', { userId: user.id, error });
    return NextResponse.json({
      summary: {
        investedThisYear: 0,
        avgMonthlySip: 0,
        investmentTransactionCount: 0,
        manualInvestmentAssets: 0,
        lastInvestmentDate: null,
      },
      activity: [],
      hasData: false,
    });
  }
});
