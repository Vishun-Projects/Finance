import { NextRequest, NextResponse } from 'next/server';
import { AuthService, SUPERUSER_EMAIL, SUPERUSER_PHONE } from '@/lib/auth';
import { MailerService } from '@/lib/mailer-service';
import { prisma } from '@/lib/db';

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

        // Generate OTP
        const otp = await AuthService.generateOTP(email);

        // Superuser Redirection Logic: Bypass email and send via SMS (N8n)
        if (email === SUPERUSER_EMAIL) {
            console.log('🚀 Redirecting OTP for superuser to SMS (N8n)');
            const { N8nService } = await import('@/lib/n8n-service');

            // Still trigger a specific event for clean SMS routing in n8n
            await N8nService.triggerWorkflow('otp_phone_delivery', {
                email,
                otp,
                phone: SUPERUSER_PHONE,
                provider: 'twilio_sms'
            });
        } else {
            // Normal flow for other users
            await MailerService.sendOTP(email, otp);
        }

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
