const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const date = new Date('2026-02-03');
    // Adjust to start/end of day logic if needed, or just finding by approximate date match if the unique constraint is strictly on date (datetime).
    // The schema says `date DateTime @unique`. Usually this implies a specific timestamp or just the date part if handled correctly.
    // Let's try to find one around this timestamp.

    const start = new Date('2026-02-03T00:00:00.000Z');
    const end = new Date('2026-02-03T23:59:59.999Z');

    const briefing = await prisma.dailyBriefing.findFirst({
        where: {
            date: {
                gte: start,
                lte: end
            }
        }
    });

    console.log('Current Briefing:', briefing);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
