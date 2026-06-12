import { NextRequest, NextResponse } from 'next/server';
import { BriefingService } from '@/services/briefing-service';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        const searchParams = request.nextUrl.searchParams;
        const force = searchParams.get('force') === 'true';

        if (force) {
            if (!user) {
                return unauthorizedResponse();
            }
            if (user.role !== 'SUPERUSER') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const locationParam = searchParams.get('location') || 'India';
        const normalizedLocation = locationParam.trim();

        const dateParam = searchParams.get('date');
        const today = dateParam ? new Date(dateParam) : new Date();

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
