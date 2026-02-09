import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { MailerService } from '@/lib/mailer-service';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // Security: Don't reveal if user exists
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

        // Generate and send OTP
        const otp = await AuthService.generateOTP(email);
        await MailerService.sendOTP(email, otp);

        return NextResponse.json(
            { message: 'If this email is registered, a verification code has been sent.' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('Request OTP Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
