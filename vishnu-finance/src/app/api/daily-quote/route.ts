import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/daily-quote
 */
export async function GET() {
    try {
        const quote = await (prisma as any).dailyQuote.findFirst({
            orderBy: { date: 'desc' }
        });

        if (!quote) {
            return NextResponse.json({
                text: "The best way to predict the future is to create it.",
                author: "Peter Drucker",
                isPlaceholder: true
            });
        }

        return NextResponse.json(quote);
    } catch (error) {
        console.error('Error fetching daily quote:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
