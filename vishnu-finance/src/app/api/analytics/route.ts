import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { loadAnalyticsBootstrap } from '@/features/analytics/loaders';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) return null;
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const data = await loadAnalyticsBootstrap(user.id, { preset, startDate, endDate });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[analytics]', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
