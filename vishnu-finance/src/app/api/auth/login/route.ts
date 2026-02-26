import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔐 LOGIN API - Starting login request');
  let email = '';
  try {
    const body = await request.json();
    email = body.email;
    const { password } = body;
    console.log('🔐 LOGIN API - Login attempt for email:', email);

    if (!email || !password) {
      console.log('❌ LOGIN API - Missing email or password');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    console.log('🔐 LOGIN API - Attempting to authenticate user...');
    const result = await AuthService.loginUser(email, password);
    console.log('🔐 LOGIN API - Auth service result:', JSON.stringify(result, null, 2));

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: (result as any).user
    });

    if (result.user && result.token) {
      // Set the auth cookie
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: true, // Always secure for sameSite: none compatibility
        sameSite: 'none', // Required for cross-site cookie usage in some webviews
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      console.log(`✅ LOGIN API - Cookie set successfully in ${Date.now() - startTime}ms total`);

      const meta = extractRequestMeta(request);

      await writeAuditLog({
        actorId: result.user.id,
        event: 'USER_LOGIN',
        severity: 'INFO',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        message: `${result.user.email} signed in`,
      });
    }

    return response;
  } catch (error) {
    console.error('❌ LOGIN API - Error during login:', error);
    console.error('❌ LOGIN API - Error details:', JSON.stringify(error, null, 2));
    console.log(`⏱️ LOGIN API - Failed in ${Date.now() - startTime}ms`);

    if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes('Invalid email or password') || msg.includes('Account is deactivated') || msg.includes('Email does not exist') || msg.includes('Password is incorrect')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      if (msg.includes('Account not verified')) {
        return NextResponse.json({
          error: msg,
          requiresVerification: true,
          email: email // Return email to help frontend redirect to OTP page
        }, { status: 403 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
