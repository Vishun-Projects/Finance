const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching recent briefings...');
    const briefings = await prisma.dailyBriefing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    briefings.forEach(b => {
        console.log(`ID: ${b.id}`);
        console.log(`Date: ${b.date}`);
        console.log(`Title: ${b.title}`);
        console.log(`Hero Image: ${b.heroImage}`);
        console.log('-------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
