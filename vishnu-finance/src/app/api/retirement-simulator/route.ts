import { withAuth } from '@/lib/api-auth';
import { projectRetirementCorpus } from '@/lib/retirement-simulator';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withAuth(async (request, _user) => {
  const body = await request.json();
  const { currentAge, retirementAge, currentCorpus, monthlySip, expectedAnnualReturn } = body as {
    currentAge: number;
    retirementAge: number;
    currentCorpus: number;
    monthlySip: number;
    expectedAnnualReturn?: number;
  };

  if (
    typeof currentAge !== 'number' ||
    typeof retirementAge !== 'number' ||
    retirementAge <= currentAge
  ) {
    return NextResponse.json({ error: 'Invalid ages' }, { status: 400 });
  }

  const projection = projectRetirementCorpus({
    currentAge,
    retirementAge,
    currentCorpus: Number(currentCorpus) || 0,
    monthlySip: Number(monthlySip) || 0,
    expectedAnnualReturn: Number(expectedAnnualReturn) || 12,
  });

  return NextResponse.json({
    projection,
    disclaimer: 'Illustrative projection only; not investment advice.',
  });
});
