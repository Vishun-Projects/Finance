import { NextRequest, NextResponse } from 'next/server';
import { N8nService } from '@/lib/n8n-service';
import { requireUser } from '@/lib/auth/server-auth';

/**
 * POST /api/n8n/test-notification
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { message } = body;

        const result = await N8nService.sendNotification(
            user.id,
            message || "This is a test notification from your Finance App!"
        );

        if (result) {
            return NextResponse.json({ success: true, result });
        } else {
            return NextResponse.json({
                error: 'Failed to trigger notification. Check N8N_WEBHOOK_URL configuration.'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in test-notification API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
