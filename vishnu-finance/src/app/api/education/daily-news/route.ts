import { NextRequest, NextResponse } from 'next/server';
import { BriefingService } from '@/services/briefing-service';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const locationParam = searchParams.get('location') || 'India';
        const normalizedLocation = locationParam.trim();

        // Always fetch for "Today" (server time) as per original logic
        const today = new Date();

        console.log(`[DailyNews API] Requesting briefing for ${today.toISOString()} in ${normalizedLocation}`);

        const briefing = await BriefingService.getOrGenerate(today, normalizedLocation);

        if (!briefing) {
            return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
        }

        return NextResponse.json(briefing);

    } catch (error) {
        console.error('❌ DAILY NEWS API ERROR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
