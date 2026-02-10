const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'vishun@finance.com';
    console.log(`🔍 Checking and fixing superuser: ${email}`);

    try {
        const user = await prisma.user.update({
            where: { email },
            data: {
                isVerified: true,
                phone: '+918108940178',
                isActive: true,
                role: 'SUPERUSER'
            }
        });

        console.log('✅ Superuser record updated and verified:');
        console.log(JSON.stringify(user, null, 2));
    } catch (error) {
        console.error('❌ Error updating superuser:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
