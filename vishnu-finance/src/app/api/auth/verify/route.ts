import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json(
                { error: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        // Verify OTP
        const result = await AuthService.verifyOTP(email, otp);

        const response = NextResponse.json({
            success: true,
            message: 'Email verified successfully',
            user: result.user
        });

        // Set auth cookie
        response.cookies.set('auth-token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return response;

    } catch (error: any) {
        console.error('OTP Verification Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to verify OTP' },
            { status: 400 }
        );
    }
}
