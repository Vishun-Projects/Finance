const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkQueue() {
    try {
        const jobs = await prisma.imageGenerationJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        console.log('--- Image Generation Jobs ---');
        if (jobs.length === 0) {
            console.log('No jobs found.');
        } else {
            jobs.forEach(job => {
                console.log(`[${job.status}] ID: ${job.id} | Type: ${job.entityType} | Created: ${job.createdAt}`);
                if (job.error) console.log(`   Error: ${job.error}`);
            });
        }

        const counts = await prisma.imageGenerationJob.groupBy({
            by: ['status'],
            _count: true
        });
        console.log('\n--- Status Summary ---');
        console.log(JSON.stringify(counts, null, 2));

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkQueue();
