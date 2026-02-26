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
            user: (result as any).user
        });

        // Set auth cookie
        if ((result as any).token) {
            response.cookies.set('auth-token', (result as any).token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 // 7 days
            });
        }

        return response;

    } catch (error: any) {
        console.error('OTP Verification Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to verify OTP' },
            { status: 400 }
        );
    }
}
