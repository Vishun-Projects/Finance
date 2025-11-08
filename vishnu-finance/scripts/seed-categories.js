#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Comprehensive default categories
const defaultCategories = [
  // Income Categories
  { name: 'Salary', type: 'INCOME', color: '#10B981', isDefault: true },
  { name: 'Freelance', type: 'INCOME', color: '#3B82F6', isDefault: true },
  { name: 'Investment Returns', type: 'INCOME', color: '#8B5CF6', isDefault: true },
  { name: 'Business', type: 'INCOME', color: '#F59E0B', isDefault: true },
  { name: 'Bonus', type: 'INCOME', color: '#EF4444', isDefault: true },
  { name: 'Rental Income', type: 'INCOME', color: '#06B6D4', isDefault: true },
  { name: 'Dividends', type: 'INCOME', color: '#84CC16', isDefault: true },
  { name: 'Interest', type: 'INCOME', color: '#F97316', isDefault: true },
  { name: 'Gifts & Donations', type: 'INCOME', color: '#EC4899', isDefault: true },
  { name: 'Other Income', type: 'INCOME', color: '#6B7280', isDefault: true },

  // Expense Categories
  { name: 'Food & Dining', type: 'EXPENSE', color: '#10B981', isDefault: true },
  { name: 'Transportation', type: 'EXPENSE', color: '#F59E0B', isDefault: true },
  { name: 'Housing', type: 'EXPENSE', color: '#3B82F6', isDefault: true },
  { name: 'Utilities', type: 'EXPENSE', color: '#8B5CF6', isDefault: true },
  { name: 'Entertainment', type: 'EXPENSE', color: '#EF4444', isDefault: true },
  { name: 'Healthcare', type: 'EXPENSE', color: '#EC4899', isDefault: true },
  { name: 'Education', type: 'EXPENSE', color: '#06B6D4', isDefault: true },
  { name: 'Shopping', type: 'EXPENSE', color: '#84CC16', isDefault: true },
  { name: 'Insurance', type: 'EXPENSE', color: '#F97316', isDefault: true },
  { name: 'Personal Care', type: 'EXPENSE', color: '#A855F7', isDefault: true },
  { name: 'Travel', type: 'EXPENSE', color: '#14B8A6', isDefault: true },
  { name: 'Subscriptions', type: 'EXPENSE', color: '#F43F5E', isDefault: true },
  { name: 'Debt Payment', type: 'EXPENSE', color: '#DC2626', isDefault: true },
  { name: 'Taxes', type: 'EXPENSE', color: '#7C2D12', isDefault: true },
  { name: 'Charity & Donations', type: 'EXPENSE', color: '#059669', isDefault: true },
  { name: 'Other Expenses', type: 'EXPENSE', color: '#6B7280', isDefault: true },
];

async function main() {
  console.log('🌱 Seeding default categories...\n');

  let created = 0;
  let skipped = 0;

  for (const category of defaultCategories) {
    try {
      // Check if category exists
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: category.name,
          type: category.type,
          isDefault: true,
        },
      });

      if (!existingCategory) {
        await prisma.category.create({
          data: category,
        });
        console.log(`✅ Created: ${category.name} (${category.type})`);
        created++;
      } else {
        console.log(`ℹ️  Already exists: ${category.name} (${category.type})`);
        skipped++;
      }
    } catch (error) {
      console.error(`❌ Error creating ${category.name}:`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${defaultCategories.length}`);
  console.log('\n✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

