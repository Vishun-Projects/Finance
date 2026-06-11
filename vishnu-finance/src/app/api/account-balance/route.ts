import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getCurrentAccountBalance } from '@/lib/account-balance-service';

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

    const balance = await getCurrentAccountBalance(user.id);
    return NextResponse.json(balance);
  } catch (error) {
    console.error('[account-balance]', error);
    return NextResponse.json({ error: 'Failed to load balance' }, { status: 500 });
  }
}
