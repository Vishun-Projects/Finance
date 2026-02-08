import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { N8nService } from '@/lib/n8n-service';

async function requireSuperuser(request: NextRequest) {
    const token = request.cookies.get('auth-token');
    if (!token) return null;
    const user = await AuthService.getUserFromToken(token.value);
    if (!user || user.role !== 'SUPERUSER' || !user.isActive) return null;
    return user;
}

export async function POST(request: NextRequest) {
    try {
        const superuser = await requireSuperuser(request);
        if (!superuser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        await N8nService.broadcastNotification(message);

        return NextResponse.json({ success: true, message: 'Broadcast initiated' });
    } catch (error) {
        console.error('Failed to initiate broadcast:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
