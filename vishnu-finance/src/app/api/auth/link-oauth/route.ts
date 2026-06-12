import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { setSessionCookies } from '@/lib/session-cookies';
import { validateOrigin } from '@/lib/request-guard';

export const dynamic = 'force-dynamic';

/** Link OAuth provider to an existing password account after user confirms credentials. */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware('auth', request);
  if (rateLimitResponse) return rateLimitResponse;

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  try {
    const { email, password, provider, sub, picture } = await request.json();

    if (!email || !password || !provider || !sub) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await AuthService.loginUser(email, password);
    if (!user.user) {
      return NextResponse.json({ error: 'Invalid credentials or verification required' }, { status: 401 });
    }

    const linked = await AuthService.linkOAuthAccount(user.user.id, provider, sub, picture);

    const response = NextResponse.json({
      success: true,
      user: {
        id: linked.id,
        email: linked.email,
        name: linked.name,
        role: linked.role,
      },
    });

    await setSessionCookies(response, {
      id: linked.id,
      email: linked.email,
      name: linked.name,
      role: linked.role,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to link OAuth account' }, { status: 401 });
  }
}
