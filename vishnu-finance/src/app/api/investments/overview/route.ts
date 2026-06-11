import { withAuth } from '@/lib/api-auth';
import { getInvestmentsOverview } from '@/lib/investments-overview-service';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, user) => {
  const overview = await getInvestmentsOverview(user.id);
  return NextResponse.json(overview);
});
