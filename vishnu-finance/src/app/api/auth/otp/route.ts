import { NextRequest, NextResponse } from 'next/server';
import { AuthService, deliverOtpToUser, findUserByEmail, normalizeEmail } from '@/lib/auth';
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
        const { email: rawEmail } = await request.json();

        if (!rawEmail) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const email = normalizeEmail(rawEmail);

        const user = await findUserByEmail(email);

        if (!user) {
            return NextResponse.json(
                { message: 'If this email is registered, a verification code has been sent.' },
                { status: 200 }
            );
        }

        if (!user.isActive) {
            return NextResponse.json(
                { error: 'Account is deactivated' },
                { status: 403 }
            );
        }

        const otp = await AuthService.generateOTP(user.email);

        try {
            await deliverOtpToUser(user.email, otp);
        } catch (deliveryError) {
            console.error('OTP delivery failed:', deliveryError);
            return NextResponse.json(
                {
                    error: 'Could not send verification code. Try Google sign-in or check SMTP settings.',
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { message: 'If this email is registered, a verification code has been sent.' },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error('Request OTP Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
