import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { corsPreflightHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsPreflightHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware('auth', request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Register user
    const result = await AuthService.registerUser(email, password, name);

    // Prepare response
    const responsePayload: any = {
      message: 'User registered successfully',
      user: result.user
    };

    if (result.requiresVerification) {
      responsePayload.requiresVerification = true;
    }

    const response = NextResponse.json(responsePayload, { status: 201 });

    return response;

  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.message === 'User already exists with this email') {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
