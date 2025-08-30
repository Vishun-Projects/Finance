#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Setting up Vishnu\'s Finance...')

  // Create default categories
  const defaultCategories = [
    // Income categories
    { name: 'Salary', type: 'INCOME', color: '#10B981', isDefault: true },
    { name: 'Freelance', type: 'INCOME', color: '#3B82F6', isDefault: true },
    { name: 'Investment', type: 'INCOME', color: '#8B5CF6', isDefault: true },
    { name: 'Business', type: 'INCOME', color: '#F59E0B', isDefault: true },
    { name: 'Other Income', type: 'INCOME', color: '#6B7280', isDefault: true },

    // Expense categories
    { name: 'Housing', type: 'EXPENSE', color: '#3B82F6', isDefault: true },
    { name: 'Food', type: 'EXPENSE', color: '#10B981', isDefault: true },
    { name: 'Transportation', type: 'EXPENSE', color: '#F59E0B', isDefault: true },
    { name: 'Utilities', type: 'EXPENSE', color: '#8B5CF6', isDefault: true },
    { name: 'Entertainment', type: 'EXPENSE', color: '#EF4444', isDefault: true },
    { name: 'Healthcare', type: 'EXPENSE', color: '#EC4899', isDefault: true },
    { name: 'Education', type: 'EXPENSE', color: '#06B6D4', isDefault: true },
    { name: 'Shopping', type: 'EXPENSE', color: '#84CC16', isDefault: true },
    { name: 'Insurance', type: 'EXPENSE', color: '#F97316', isDefault: true },
    { name: 'Other Expenses', type: 'EXPENSE', color: '#6B7280', isDefault: true },
  ]

  console.log('📝 Creating default categories...')
  
  for (const category of defaultCategories) {
    try {
      await prisma.category.upsert({
        where: { 
          name_type: {
            name: category.name,
            type: category.type
          }
        },
        update: {},
        create: category,
      })
      console.log(`✅ Created category: ${category.name} (${category.type})`)
    } catch (error) {
      console.log(`⚠️  Category ${category.name} already exists or error: ${error.message}`)
    }
  }

  // Create a demo user
  console.log('👤 Creating demo user...')
  try {
    const user = await prisma.user.upsert({
      where: { email: 'demo@vishnufinance.com' },
      update: {},
      create: {
        email: 'demo@vishnufinance.com',
        name: 'Demo User',
      },
    })
    console.log(`✅ Created demo user: ${user.email}`)
  } catch (error) {
    console.log(`⚠️  Demo user already exists or error: ${error.message}`)
  }

  console.log('🎉 Setup completed successfully!')
  console.log('\n📋 Next steps:')
  console.log('1. Update your .env file with your database credentials')
  console.log('2. Run: npm run dev')
  console.log('3. Open http://localhost:3000 in your browser')
  console.log('\n💡 For production deployment:')
  console.log('- Set up a MySQL database')
  console.log('- Update DATABASE_URL in your environment')
  console.log('- Run: npx prisma db push')
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })