import { withAuth } from '@/lib/api-auth';
import { buildCashflowForecast } from '@/lib/cashflow-forecast-service';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, user) => {
  const forecast = await buildCashflowForecast(user.id);
  return NextResponse.json(forecast);
});
