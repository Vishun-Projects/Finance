import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const N8N_SECRET_TOKEN = process.env.N8N_SECRET_TOKEN;

/**
 * Endpoint for n8n to push data into the app
 * POST /api/n8n/webhook
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('x-n8n-token');

        // Basic security check
        if (N8N_SECRET_TOKEN && authHeader !== N8N_SECRET_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            const text = await request.text();
            if (!text) {
                return NextResponse.json({ error: 'Empty body' }, { status: 400 });
            }
            body = JSON.parse(text);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { type, data } = body;

        switch (type) {
            case 'DAILY_QUOTE':
                // Save new daily quote
                const fallbackTexts = [
                    "Fortune favors the bold.",
                    "The best way to predict the future is to create it.",
                    "Compound interest is the eighth wonder of the world.",
                    "Don't save what is left after spending; spend what is left after saving."
                ];
                const randomText = fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)];

                await (prisma as any).dailyQuote.create({
                    data: {
                        text: data?.text || randomText,
                        author: data?.author || 'Vishnu Finance AI',
                        category: data?.category || 'General',
                    }
                });
                break;

            case 'NOTIFICATION':
            case 'notification':
                // This is just a loop-back of the notification from n8n
                console.log('✅ Notification loop-back confirmed:', data);
                break;

            case 'DAILY_NEWS':
                // Save new daily briefing/news
                if (!data || !data.title || !data.content) {
                    return NextResponse.json({ error: 'Missing news title or content' }, { status: 400 });
                }
                const newsDate = data.date ? new Date(data.date) : new Date();
                newsDate.setHours(0, 0, 0, 0);

                await prisma.dailyBriefing.upsert({
                    where: { date: newsDate },
                    update: {
                        title: data.title,
                        content: data.content,
                        summary: data.summary || [],
                        sentiment: data.sentiment || 'Neutral',
                        sentimentScore: data.sentimentScore || 50,
                        heroImage: data.heroImage,
                        sources: data.sources || []
                    },
                    create: {
                        date: newsDate,
                        title: data.title,
                        content: data.content,
                        summary: data.summary || [],
                        sentiment: data.sentiment || 'Neutral',
                        sentimentScore: data.sentimentScore || 50,
                        heroImage: data.heroImage,
                        sources: data.sources || []
                    }
                });
                break;

            case 'BANK_STATEMENT_PROCESSED':
                // Handle processed bank statement (Gemini OCR)
                console.log('Processed statement received:', data);
                break;

            default:
                console.warn('Unknown n8n webhook type:', type);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in n8n webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
