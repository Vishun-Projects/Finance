import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { loadDisciplineSummary } from '@/features/plans/loaders-discipline';

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

    const summary = await loadDisciplineSummary(user.id);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[plans/discipline]', error);
    return NextResponse.json({ error: 'Failed to load discipline summary' }, { status: 500 });
  }
}
