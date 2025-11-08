/**
 * Migration Script: Convert Expense and IncomeSource records to Transaction model
 * 
 * This script migrates existing Expense and IncomeSource records to the new Transaction model.
 * Run this after creating the Transaction table via Prisma migration.
 * 
 * Usage: node scripts/migrate-to-transactions.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateToTransactions() {
  console.log('🔄 Starting migration to Transaction model...\n');

  try {
    // Step 1: Migrate Expense records
    console.log('📝 Step 1: Migrating Expense records...');
    const expenses = await prisma.expense.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        category: true,
      },
    });

    console.log(`   Found ${expenses.length} expense records to migrate`);

    let expenseMigrated = 0;
    const expenseBatchSize = 500;

    for (let i = 0; i < expenses.length; i += expenseBatchSize) {
      const batch = expenses.slice(i, i + expenseBatchSize);
      const transactions = batch.map(exp => ({
        userId: exp.userId,
        transactionDate: exp.date,
        description: exp.description || '',
        creditAmount: 0,
        debitAmount: Number(exp.amount),
        financialCategory: 'EXPENSE',
        categoryId: exp.categoryId,
        accountStatementId: null, // Can't determine from existing data
        notes: exp.notes,
        receiptUrl: exp.receiptUrl,
        // Bank-specific fields
        bankCode: exp.bankCode,
        transactionId: exp.transactionId,
        accountNumber: exp.accountNumber,
        transferType: exp.transferType,
        personName: exp.personName,
        upiId: exp.upiId,
        branch: exp.branch,
        store: exp.store,
        rawData: exp.rawData,
        balance: null,
        isDeleted: exp.isDeleted,
        deletedAt: exp.deletedAt,
        createdAt: exp.createdAt,
        updatedAt: exp.updatedAt,
      }));

      await prisma.transaction.createMany({
        data: transactions,
        skipDuplicates: true,
      });

      expenseMigrated += transactions.length;
      console.log(`   Migrated ${expenseMigrated}/${expenses.length} expenses`);
    }

    console.log(`✅ Migrated ${expenseMigrated} expense records\n`);

    // Step 2: Migrate IncomeSource records
    console.log('📝 Step 2: Migrating IncomeSource records...');
    const incomeSources = await prisma.incomeSource.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        category: true,
      },
    });

    console.log(`   Found ${incomeSources.length} income source records to migrate`);

    let incomeMigrated = 0;
    const incomeBatchSize = 500;

    for (let i = 0; i < incomeSources.length; i += incomeBatchSize) {
      const batch = incomeSources.slice(i, i + incomeBatchSize);
      const transactions = batch.map(inc => ({
        userId: inc.userId,
        transactionDate: inc.startDate,
        description: inc.name || '',
        creditAmount: Number(inc.amount),
        debitAmount: 0,
        financialCategory: 'INCOME',
        categoryId: inc.categoryId,
        accountStatementId: null, // Can't determine from existing data
        notes: inc.notes,
        receiptUrl: null,
        // Bank-specific fields
        bankCode: inc.bankCode,
        transactionId: inc.transactionId,
        accountNumber: inc.accountNumber,
        transferType: inc.transferType,
        personName: inc.personName,
        upiId: inc.upiId,
        branch: inc.branch,
        store: inc.store,
        rawData: inc.rawData,
        balance: null,
        isDeleted: inc.isDeleted,
        deletedAt: inc.deletedAt,
        createdAt: inc.createdAt,
        updatedAt: inc.updatedAt,
      }));

      await prisma.transaction.createMany({
        data: transactions,
        skipDuplicates: true,
      });

      incomeMigrated += transactions.length;
      console.log(`   Migrated ${incomeMigrated}/${incomeSources.length} income sources`);
    }

    console.log(`✅ Migrated ${incomeMigrated} income source records\n`);

    // Step 3: Summary
    const totalTransactions = await prisma.transaction.count();
    console.log('📊 Migration Summary:');
    console.log(`   Total transactions created: ${totalTransactions}`);
    console.log(`   From expenses: ${expenseMigrated}`);
    console.log(`   From income sources: ${incomeMigrated}`);
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  Note: Expense and IncomeSource records are preserved for backward compatibility.');
    console.log('   You can safely delete them after verifying the migration.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  migrateToTransactions()
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { migrateToTransactions };

