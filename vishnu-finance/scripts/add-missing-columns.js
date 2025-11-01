const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns to database...\n');

    // Get database connection from Prisma
    const columns = [
      { table: 'income_sources', column: 'store', type: 'VARCHAR(191) NULL' },
      { table: 'income_sources', column: 'upiId', type: 'VARCHAR(191) NULL' },
      { table: 'income_sources', column: 'branch', type: 'VARCHAR(191) NULL' },
      { table: 'income_sources', column: 'personName', type: 'VARCHAR(191) NULL' },
      { table: 'income_sources', column: 'rawData', type: 'TEXT NULL' },
      { table: 'expenses', column: 'store', type: 'VARCHAR(191) NULL' },
      { table: 'expenses', column: 'upiId', type: 'VARCHAR(191) NULL' },
      { table: 'expenses', column: 'branch', type: 'VARCHAR(191) NULL' },
      { table: 'expenses', column: 'personName', type: 'VARCHAR(191) NULL' },
      { table: 'expenses', column: 'rawData', type: 'TEXT NULL' },
    ];

    for (const { table, column, type } of columns) {
      try {
        // Try to add the column
        await prisma.$executeRawUnsafe(
          `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${type}`
        );
        console.log(`✅ Added ${column} to ${table}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name') || error.code === 'P2010') {
          console.log(`ℹ️  Column ${column} already exists in ${table}`);
        } else {
          console.error(`❌ Error adding ${column} to ${table}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();

