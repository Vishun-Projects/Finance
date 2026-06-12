import { NextRequest, NextResponse } from 'next/server';
import { loadPlanPreviewCached } from '@/lib/server-data-cache';
import { AuthService } from '@/lib/auth';

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

    const preview = await loadPlanPreviewCached(user.id);
    return NextResponse.json(preview);
  } catch (error) {
    console.error('[plan-preview]', error);
    return NextResponse.json({ error: 'Failed to load plan preview' }, { status: 500 });
  }
}
