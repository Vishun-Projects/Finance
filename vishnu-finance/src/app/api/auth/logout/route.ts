import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0)
  });

  const token = request.cookies.get('auth-token');
  if (token) {
    const user = await AuthService.getUserFromToken(token.value);
    if (user) {
      const meta = extractRequestMeta(request);
      await writeAuditLog({
        actorId: user.id,
        event: 'USER_LOGOUT',
        severity: 'INFO',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        message: `${user.email} logged out`,
      });
    }
  }

  return response;
}
