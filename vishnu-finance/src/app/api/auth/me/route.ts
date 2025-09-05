import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  console.log('🔐 AUTH/ME API - Starting request');
  try {
    // Get the auth token from cookies
    const authToken = request.cookies.get('auth-token');
    console.log('🔐 AUTH/ME API - Auth token found:', !!authToken);

    if (!authToken) {
      console.log('❌ AUTH/ME API - No auth token found');
      return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
    }

    console.log('🔐 AUTH/ME API - Getting user from token...');
    const user = await AuthService.getUserFromToken(authToken.value);
    console.log('🔐 AUTH/ME API - User from token:', JSON.stringify(user, null, 2));

    if (!user) {
      console.log('❌ AUTH/ME API - Invalid or expired token');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!user.isActive) {
      console.log('❌ AUTH/ME API - User account is deactivated');
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 401 });
    }

    console.log('✅ AUTH/ME API - User authenticated successfully');
    return NextResponse.json({ user });
  } catch (error) {
    console.error('❌ AUTH/ME API - Error:', error);
    console.error('❌ AUTH/ME API - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
