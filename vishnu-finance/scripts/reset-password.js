const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    console.log('🔧 Password Reset Utility\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true
      }
    });

    console.log('👥 Available users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || user.email} (${user.email})`);
    });

    // Reset password for the first user (Vishnu)
    const targetUser = users.find(u => u.email === 'vishun.orv@gmail.com') || users[0];

    if (targetUser) {
      const newPassword = process.env.DEFAULT_PASSWORD || 'password123'; // Optional env override
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { password: hashedPassword }
      });

      console.log(`\n✅ Password reset successful!`);
      console.log(`   User: ${targetUser.name || targetUser.email}`);
      console.log(`   Email: ${targetUser.email}`);
      console.log(`   New password: ${newPassword}`);
      console.log(`   Password is now properly hashed`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
