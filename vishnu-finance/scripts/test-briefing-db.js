const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Testing DailyBriefing model...');
    try {
        const count = await prisma.dailyBriefing.count();
        console.log(`✅ Connection successful. Found ${count} daily briefings.`);

        // Attempt to read one if exists
        if (count > 0) {
            const first = await prisma.dailyBriefing.findFirst();
            console.log('Sample:', first.title);
        }
    } catch (error) {
        console.error('❌ Error accessing DailyBriefing model:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
