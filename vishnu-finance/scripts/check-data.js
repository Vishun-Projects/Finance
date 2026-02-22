const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Checking database data...\n');

    // Check users
    const users = await prisma.user.findMany();
    console.log(`👥 Users: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.name || user.email} (${user.id})`);
    });

    // Check income sources
    const incomeSources = await prisma.incomeSource.findMany();
    console.log(`\n💰 Income Sources: ${incomeSources.length}`);
    incomeSources.forEach(income => {
      console.log(`  - ${income.name}: ₹${income.amount} (${income.frequency})`);
    });

    // Check expenses
    const expenses = await prisma.expense.findMany();
    console.log(`\n💸 Expenses: ${expenses.length}`);
    expenses.forEach(expense => {
      console.log(`  - ${expense.description || 'Expense'}: ₹${expense.amount} (${expense.date.toDateString()})`);
    });

    // Check goals
    const goals = await prisma.goal.findMany();
    console.log(`\n🎯 Goals: ${goals.length}`);
    goals.forEach(goal => {
      console.log(`  - ${goal.title}: ₹${goal.currentAmount}/${goal.targetAmount}`);
    });

    // Check deadlines
    const deadlines = await prisma.deadline.findMany();
    console.log(`\n📅 Deadlines: ${deadlines.length}`);
    deadlines.forEach(deadline => {
      console.log(`  - ${deadline.title}: ₹${deadline.amount || 0} (${deadline.dueDate.toDateString()})`);
    });

    // Check categories
    const categories = await prisma.category.findMany();
    console.log(`\n📂 Categories: ${categories.length}`);
    categories.forEach(category => {
      console.log(`  - ${category.name} (${category.type})`);
    });

    if (users.length === 0) {
      console.log('\n⚠️  No users found! Creating a test user...');
      const testUser = await prisma.user.create({
        data: {
          email: process.env.TEST_USER_EMAIL || 'test@example.com',
          name: process.env.TEST_USER_NAME || 'Test User',
          password: process.env.TEST_USER_PASSWORD || 'hashedpassword123'
        }
      });
      console.log(`✅ Created test user: ${testUser.name} (${testUser.id})`);
    }

    if (incomeSources.length === 0 && users.length > 0) {
      console.log('\n⚠️  No income sources found! Creating sample data...');
      const user = users[0];

      // Create sample income
      await prisma.incomeSource.create({
        data: {
          name: 'Salary',
          amount: 75000,
          frequency: 'MONTHLY',
          startDate: new Date(),
          userId: user.id
        }
      });

      // Create sample expenses
      await prisma.expense.createMany({
        data: [
          {
            amount: 15000,
            description: 'Rent',
            date: new Date(),
            userId: user.id
          },
          {
            amount: 5000,
            description: 'Groceries',
            date: new Date(),
            userId: user.id
          },
          {
            amount: 3000,
            description: 'Transport',
            date: new Date(),
            userId: user.id
          }
        ]
      });

      // Create sample goal
      await prisma.goal.create({
        data: {
          title: 'Emergency Fund',
          targetAmount: 150000,
          currentAmount: 50000,
          targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          userId: user.id
        }
      });

      console.log('✅ Created sample financial data!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
