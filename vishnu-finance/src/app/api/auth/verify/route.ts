import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService, findUserByEmail, normalizeEmail } from '@/lib/auth';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { setSessionCookies, clearSessionCookies } from '@/lib/session-cookies';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware('auth', request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { email: rawEmail, otp } = await request.json();

    if (!rawEmail || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);

    const verified = await AuthService.verifyOTP(email, otp);
    if (!verified) {
      const { writeAuditLog, extractRequestMeta } = await import('@/lib/audit');
      const meta = extractRequestMeta(request);
      await writeAuditLog({
        actorId: 'anonymous',
        event: 'AUTH_OTP_FAILED',
        severity: 'WARN',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        message: `Failed OTP verification for ${email}`,
        metadata: { email },
      });
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
    });

    await setSessionCookies(response, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return response;
  } catch (error: unknown) {
    console.error('OTP Verification Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify OTP';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
