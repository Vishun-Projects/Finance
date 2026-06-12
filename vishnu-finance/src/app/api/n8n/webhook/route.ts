import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyCronSecret } from '@/lib/api-auth';

const N8N_SECRET_TOKEN = process.env.N8N_SECRET_TOKEN;

/**
 * Endpoint for n8n to push data into the app
 * POST /api/n8n/webhook
 */
export async function POST(request: NextRequest) {
  try {
    if (!N8N_SECRET_TOKEN) {
      console.warn('[n8n/webhook] N8N_SECRET_TOKEN is not set — rejecting request');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('x-n8n-token');
    if (authHeader !== N8N_SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json({ error: 'Empty body' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { type, data } = body;
    const payloadSize = JSON.stringify(body).length;

    const { writeAuditLog } = await import('@/lib/audit');
    await writeAuditLog({
      actorId: 'n8n',
      event: 'N8N_WEBHOOK',
      severity: 'INFO',
      message: `n8n webhook received: ${type ?? 'unknown'}`,
      metadata: { type, payloadSize },
    });

    switch (type) {
      case 'DAILY_QUOTE': {
        const fallbackTexts = [
          'Fortune favors the bold.',
          'The best way to predict the future is to create it.',
          'Compound interest is the eighth wonder of the world.',
          "Don't save what is left after spending; spend what is left after saving.",
        ];
        const randomText = fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)];

        await (prisma as any).dailyQuote.create({
          data: {
            text: data?.text || randomText,
            author: data?.author || 'Vishnu Finance AI',
            category: data?.category || 'General',
          },
        });
        break;
      }

      case 'NOTIFICATION':
      case 'notification':
        break;

      case 'DAILY_NEWS': {
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
            sources: data.sources || [],
          },
          create: {
            date: newsDate,
            title: data.title,
            content: data.content,
            summary: data.summary || [],
            sentiment: data.sentiment || 'Neutral',
            sentimentScore: data.sentimentScore || 50,
            heroImage: data.heroImage,
            sources: data.sources || [],
          },
        });
        break;
      }

      case 'BANK_STATEMENT_PROCESSED':
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
