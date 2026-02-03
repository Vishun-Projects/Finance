const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.educationPost.count();
    console.log(`Total Posts: ${count}`);

    if (count > 0) {
        const first = await prisma.educationPost.findFirst();
        console.log('Sample:', first.title);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
