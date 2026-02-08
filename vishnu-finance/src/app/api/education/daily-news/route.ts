import { NextRequest, NextResponse } from 'next/server';
import { BriefingService } from '@/services/briefing-service';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const locationParam = searchParams.get('location') || 'India';
        const normalizedLocation = locationParam.trim();

        // Parse date from query param or default to Today
        const dateParam = searchParams.get('date');
        const today = dateParam ? new Date(dateParam) : new Date();

        const force = searchParams.get('force') === 'true';
        const briefing = force
            ? await BriefingService.generate(today, normalizedLocation)
            : await BriefingService.getOrGenerate(today, normalizedLocation);

        if (!briefing) {
            return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
        }

        return NextResponse.json(briefing);

    } catch (error) {
        console.error('❌ DAILY NEWS API ERROR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
