const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPasswords() {
  try {
    console.log('🔍 Checking user passwords in database...\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isActive: true
      }
    });

    users.forEach(user => {
      console.log(`👤 User: ${user.name || user.email}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Password format: ${user.password.substring(0, 20)}...`);
      console.log(`   Is hashed: ${user.password.startsWith('$2b$')}`);
      console.log('');
    });

    // Test login for the first user
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`🧪 Testing login for: ${testUser.email}`);
      console.log(`   Try these passwords:`);
      console.log(`   - "password"`);
      console.log(`   - "123456"`);
      console.log(`   - "${testUser.password}" (if it's plain text)`);
      console.log(`   - "test"`);
      console.log(`   - "admin"`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswords();
