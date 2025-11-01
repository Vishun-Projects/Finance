import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔐 LOGIN API - Starting login request');
  try {
    const { email, password } = await request.json();
    console.log('🔐 LOGIN API - Login attempt for email:', email);

    if (!email || !password) {
      console.log('❌ LOGIN API - Missing email or password');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    console.log('🔐 LOGIN API - Attempting to authenticate user...');
    const result = await AuthService.loginUser(email, password);
    console.log('🔐 LOGIN API - Auth service result:', JSON.stringify(result, null, 2));

    console.log('✅ LOGIN API - Login successful, setting cookie');
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: result.user
    });

    // Set the auth cookie
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    console.log(`✅ LOGIN API - Cookie set successfully in ${Date.now() - startTime}ms total`);
    return response;
  } catch (error) {
    console.error('❌ LOGIN API - Error during login:', error);
    console.error('❌ LOGIN API - Error details:', JSON.stringify(error, null, 2));
    console.log(`⏱️ LOGIN API - Failed in ${Date.now() - startTime}ms`);
    
    if (error instanceof Error) {
      if (error.message === 'Invalid email or password' || error.message === 'Account is deactivated') {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
