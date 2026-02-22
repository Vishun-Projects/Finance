const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateDefaultPassword() {
  try {
    console.log('🔐 Updating all user passwords to default: password123\n');

    // Hash the default password
    const defaultPassword = process.env.DEFAULT_PASSWORD || 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    console.log('✅ Generated bcrypt hash for default password\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true
      }
    });

    console.log(`📊 Found ${users.length} user(s) in database\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found. Nothing to update.');
      return;
    }

    // Update all users with the default password
    let updatedCount = 0;
    for (const user of users) {
      // Only update if password is different
      if (user.password !== hashedPassword && !user.password.startsWith('$2b$')) {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
        updatedCount++;
        console.log(`✅ Updated password for: ${user.name || user.email}`);
      } else if (user.password !== hashedPassword) {
        // Update if it's a different hash
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
        updatedCount++;
        console.log(`✅ Updated password for: ${user.name || user.email}`);
      } else {
        console.log(`ℹ️  Password already set for: ${user.name || user.email}`);
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} user(s) with default password`);
    console.log(`\n📝 Default credentials:`);
    console.log(`   Email: vishun.orv@gmail.com`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`\n💡 All users can now login with their email and password: ${defaultPassword}`);

  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateDefaultPassword();

