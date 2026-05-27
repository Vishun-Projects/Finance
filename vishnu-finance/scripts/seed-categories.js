#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const incomeCategories = [
  { name: 'Salary', type: 'INCOME', color: '#10B981', isDefault: true },
  { name: 'Freelance', type: 'INCOME', color: '#3B82F6', isDefault: true },
  { name: 'Investment Returns', type: 'INCOME', color: '#8B5CF6', isDefault: true },
  { name: 'Business', type: 'INCOME', color: '#F59E0B', isDefault: true },
  { name: 'Bonus', type: 'INCOME', color: '#EF4444', isDefault: true },
  { name: 'Rental Income', type: 'INCOME', color: '#06B6D4', isDefault: true },
  { name: 'Dividends', type: 'INCOME', color: '#84CC16', isDefault: true },
  { name: 'Interest', type: 'INCOME', color: '#F97316', isDefault: true },
  { name: 'Gifts & Donations', type: 'INCOME', color: '#EC4899', isDefault: true },
  { name: 'Refund', type: 'INCOME', color: '#10B981', isDefault: true },
  { name: 'Transfer', type: 'INCOME', color: '#6366F1', isDefault: true },
  { name: 'Income', type: 'INCOME', color: '#8B5CF6', isDefault: true },
  { name: 'Other Income', type: 'INCOME', color: '#6B7280', isDefault: true },
];

const planExpenseCategories = [
  { name: 'Groceries + Home', type: 'EXPENSE', color: '#2563EB', isDefault: true },
  { name: 'Train Pass', type: 'EXPENSE', color: '#2563EB', isDefault: true },
  { name: 'Mobile + Internet', type: 'EXPENSE', color: '#2563EB', isDefault: true },
  { name: 'Electricity / Water', type: 'EXPENSE', color: '#2563EB', isDefault: true },
  { name: 'Personal Care', type: 'EXPENSE', color: '#2563EB', isDefault: true },
  { name: 'Medical / Pharmacy', type: 'EXPENSE', color: '#2563EB', isDefault: true },
  { name: 'Family Support', type: 'EXPENSE', color: '#2563EB', isDefault: true },
  { name: 'Needs Buffer', type: 'EXPENSE', color: '#64748B', isDefault: true },
  { name: 'Food Outside', type: 'EXPENSE', color: '#7C3AED', isDefault: true },
  { name: 'OTT + Subscriptions', type: 'EXPENSE', color: '#7C3AED', isDefault: true },
  { name: 'Clothes / Personal', type: 'EXPENSE', color: '#7C3AED', isDefault: true },
  { name: 'Entertainment / Outings', type: 'EXPENSE', color: '#7C3AED', isDefault: true },
  { name: 'Friends & Social', type: 'EXPENSE', color: '#7C3AED', isDefault: true },
  { name: 'Misc Buffer', type: 'EXPENSE', color: '#64748B', isDefault: true },
  { name: 'EMI', type: 'EXPENSE', color: '#DC2626', isDefault: true },
  { name: 'Emergency Fund', type: 'EXPENSE', color: '#16A34A', isDefault: true },
  { name: 'SIP', type: 'EXPENSE', color: '#16A34A', isDefault: true },
  { name: 'PPF', type: 'EXPENSE', color: '#16A34A', isDefault: true },
  { name: 'Direct Stocks', type: 'EXPENSE', color: '#16A34A', isDefault: true },
  { name: 'Parents Health — Mummy', type: 'EXPENSE', color: '#B45309', isDefault: true },
  { name: 'Parents Health — Papa', type: 'EXPENSE', color: '#B45309', isDefault: true },
  { name: 'Term Life Insurance', type: 'EXPENSE', color: '#B45309', isDefault: true },
  { name: 'Own Health Insurance', type: 'EXPENSE', color: '#B45309', isDefault: true },
  { name: 'Personal Accident', type: 'EXPENSE', color: '#B45309', isDefault: true },
  { name: 'Insurance Buffer', type: 'EXPENSE', color: '#64748B', isDefault: true },
  { name: 'Taxes', type: 'EXPENSE', color: '#7C2D12', isDefault: true },
  { name: 'Fees & Charges', type: 'EXPENSE', color: '#DC2626', isDefault: true },
  { name: 'Charity & Donations', type: 'EXPENSE', color: '#059669', isDefault: true },
  { name: 'Education', type: 'EXPENSE', color: '#06B6D4', isDefault: true },
  { name: 'Other Expenses', type: 'EXPENSE', color: '#6B7280', isDefault: true },
];

const defaultCategories = [...incomeCategories, ...planExpenseCategories];

async function main() {
  console.log('🌱 Seeding default categories...\n');

  let created = 0;
  let skipped = 0;

  for (const category of defaultCategories) {
    try {
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: category.name,
          type: category.type,
          isDefault: true,
        },
      });

      if (!existingCategory) {
        await prisma.category.create({ data: category });
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
