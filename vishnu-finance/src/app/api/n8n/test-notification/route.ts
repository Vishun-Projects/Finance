import { NextRequest, NextResponse } from 'next/server';
import { N8nService } from '@/lib/n8n-service';
import { requireUser } from '@/lib/auth/server-auth';
import axios from 'axios';
import https from 'https';

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

        // Debug: Direct call to Teams Webhook
        try {
            const teamsUrl = "https://defaultecad5b7df11f4f4c98a4a18703be63.22.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/d3024fef11ac409ebd151466086de121/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=jc-WPpDSYs9dVzMYCh6SqjGfZrRqWAbdPjN_85Kyg7o";

            // Force IPv4 to avoid potential IPv6 timeout issues
            const httpsAgent = new https.Agent({ family: 4 });

            await axios.post(teamsUrl, {
                "type": "message",
                "attachments": [
                    {
                        "contentType": "application/vnd.microsoft.card.adaptive",
                        "content": {
                            "type": "AdaptiveCard",
                            "body": [
                                {
                                    "type": "TextBlock",
                                    "size": "Medium",
                                    "weight": "Bolder",
                                    "text": "Test Notification"
                                },
                                {
                                    "type": "TextBlock",
                                    "text": message || "Hello 404 - Adaptive Card Test",
                                    "wrap": true
                                }
                            ],
                            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                            "version": "1.2"
                        }
                    }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                httpsAgent,
                timeout: 10000 // 10s timeout
            });
            console.log('Direct Teams Webhook sent via Axios');
        } catch (err: any) {
            console.error('Failed to send direct Teams Webhook via Axios:', err.message);
            if (err.response) {
                console.error('Response status:', err.response.status);
                console.error('Response data:', err.response.data);
            }
        }

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
