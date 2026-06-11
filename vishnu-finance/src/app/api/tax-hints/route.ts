import { withAuth } from '@/lib/api-auth';
import { computeTaxHints } from '@/lib/tax-hints-service';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, user) => {
  const hints = await computeTaxHints(user.id);
  return NextResponse.json({ hints, disclaimer: 'Estimates from transaction keywords only; not tax advice.' });
});
