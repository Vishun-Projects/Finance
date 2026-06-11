import { withAuth } from '@/lib/api-auth';
import {
  getPersonalizedFundSuggestions,
  searchFundsForUser,
} from '@/lib/investment-fund-recommendations';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAuth(async (request, user) => {
  const q = request.nextUrl.searchParams.get('q') ?? '';

  try {
    if (!q.trim()) {
      const data = await getPersonalizedFundSuggestions(user.id);
      return NextResponse.json(data);
    }

    const data = await searchFundsForUser(user.id, q.trim());
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lookup failed';
    return NextResponse.json(
      { schemes: [], error: message, query: q, disclaimer: 'Research only; not investment advice.' },
      { status: 502 },
    );
  }
});
