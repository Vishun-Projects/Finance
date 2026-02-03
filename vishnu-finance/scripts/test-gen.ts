import { BriefingService } from '@/services/briefing-service';
import { prisma } from '@/lib/db';

async function main() {
    try {
        console.log('--- STARTING GENERATION TEST ---');
        const today = new Date();
        console.log(`Testing generation for: ${today.toISOString()}`);

        const location = 'India';

        // Force generation (bypass get)
        console.log('Calling BriefingService.generate...');
        // We need to access the private method or just use 'getOrGenerate' but ensure we delete first.

        // Setup: delete any existing for range
        const start = new Date(today); start.setHours(0, 0, 0, 0);
        const end = new Date(today); end.setHours(23, 59, 59, 999);
        await prisma.dailyBriefing.deleteMany({
            where: { date: { gte: start, lte: end } }
        });
        console.log('Cleared existing entries.');

        const result = await BriefingService.getOrGenerate(today, location);

        if (result) {
            console.log('✅ Generation Success!');
            console.log('ID:', result.id);
            console.log('Title:', result.title);
            console.log('Hero Image:', result.heroImage);
            console.log('Source:', result.source);
        } else {
            console.error('❌ Generation returned NULL');
        }

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
