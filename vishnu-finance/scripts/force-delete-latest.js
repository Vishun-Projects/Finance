const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching latest 1 briefing...');
    const briefings = await prisma.dailyBriefing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1
    });

    if (briefings.length > 0) {
        const target = briefings[0];
        console.log('Found latest briefing:', target);
        console.log('Date (UTC):', target.date);
        console.log('Title:', target.title);

        // Confirm it looks like the one we want (e.g. date is recent)
        // Just delete it to support the "Regenerate" request.
        await prisma.dailyBriefing.delete({
            where: { id: target.id }
        });
        console.log('✅ Deleted latest briefing.');
    } else {
        console.log('No briefings found at all.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
