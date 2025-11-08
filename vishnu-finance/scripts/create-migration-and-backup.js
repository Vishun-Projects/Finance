/**
 * Script to create Transaction model migration and backup existing data
 * Run: node scripts/create-migration-and-backup.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function backupTable(tableName, outputFile) {
  console.log(`📦 Backing up ${tableName}...`);
  try {
    const data = await prisma.$queryRawUnsafe(`SELECT * FROM ${tableName}`);
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, outputFile);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`✅ Backed up ${data.length} records to ${backupPath}`);
    return data.length;
  } catch (error) {
    console.log(`⚠️  Could not backup ${tableName}:`, error.message);
    return 0;
  }
}

async function checkTableExists(tableName) {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch (error) {
    return false;
  }
}

async function getTableRowCount(tableName) {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
    return Number(result[0]?.count || 0);
  } catch (error) {
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting migration preparation...\n');
  
  // Check current state
  console.log('📊 Checking current database state...');
  const expensesExist = await checkTableExists('expenses');
  const incomeSourcesExist = await checkTableExists('income_sources');
  const transactionsExist = await checkTableExists('transactions');
  
  const expenseCount = expensesExist ? await getTableRowCount('expenses') : 0;
  const incomeCount = incomeSourcesExist ? await getTableRowCount('income_sources') : 0;
  const transactionCount = transactionsExist ? await getTableRowCount('transactions') : 0;
  
  console.log(`  - Expenses table: ${expensesExist ? '✅' : '❌'} (${expenseCount} records)`);
  console.log(`  - Income Sources table: ${incomeSourcesExist ? '✅' : '❌'} (${incomeCount} records)`);
  console.log(`  - Transactions table: ${transactionsExist ? '✅' : '❌'} (${transactionCount} records)`);
  
  // Backup existing data
  console.log('\n💾 Creating backups...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  let totalBackedUp = 0;
  if (expensesExist && expenseCount > 0) {
    totalBackedUp += await backupTable('expenses', `expenses_backup_${timestamp}.json`);
  }
  if (incomeSourcesExist && incomeCount > 0) {
    totalBackedUp += await backupTable('income_sources', `income_sources_backup_${timestamp}.json`);
  }
  
  console.log(`\n✅ Backup complete! Total records backed up: ${totalBackedUp}`);
  
  // Generate migration instructions
  console.log('\n📝 Next steps:');
  console.log('1. Run: npx prisma migrate dev --name add_transaction_model');
  console.log('2. After migration succeeds, run: npx prisma generate');
  console.log('3. Run data migration: node scripts/migrate-to-transactions.js');
  console.log('\n⚠️  Make sure to stop your dev server before running migrations!');
  
  await prisma.$disconnect();
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});

