const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBankFields() {
  console.log('Adding bank/transaction fields to income_sources and expenses tables...');
  
  const fields = ['bankCode', 'transactionId', 'accountNumber', 'transferType'];
  
  // Add fields to income_sources
  console.log('\nProcessing income_sources table...');
  for (const field of fields) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE income_sources ADD COLUMN \`${field}\` VARCHAR(191) NULL`);
      console.log(`✓ Added ${field} to income_sources`);
    } catch (e) {
      if (e.message?.includes('Duplicate column') || e.code === 'ER_DUP_FIELDNAME' || e.message?.includes('already exists')) {
        console.log(`- ${field} already exists in income_sources, skipping...`);
      } else {
        console.error(`✗ Error adding ${field} to income_sources:`, e.message);
      }
    }
  }
  
  // Add fields to expenses
  console.log('\nProcessing expenses table...');
  for (const field of fields) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE expenses ADD COLUMN \`${field}\` VARCHAR(191) NULL`);
      console.log(`✓ Added ${field} to expenses`);
    } catch (e) {
      if (e.message?.includes('Duplicate column') || e.code === 'ER_DUP_FIELDNAME' || e.message?.includes('already exists')) {
        console.log(`- ${field} already exists in expenses, skipping...`);
      } else {
        console.error(`✗ Error adding ${field} to expenses:`, e.message);
      }
    }
  }
  
  console.log('\n✅ All fields processed!');
  await prisma.$disconnect();
}

addBankFields().catch(console.error);
