const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDemoUser() {
  try {
    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id: 'demo-user-id'
      }
    });

    if (existingUser) {
      console.log('Demo user already exists');
      return;
    }

    // Create demo user
    const user = await prisma.user.create({
      data: {
        id: 'demo-user-id',
        email: 'demo@example.com',
        password: 'demo-password-hash',
        name: 'Demo User',
        isActive: true
      }
    });

    console.log('Demo user created successfully:', user);
  } catch (error) {
    console.error('Error creating demo user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser();
