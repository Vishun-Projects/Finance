/**
 * Database Setup Script
 * 
 * This script provides options to:
 * 1. Backup existing data
 * 2. Reset database (truncate all tables)
 * 3. Run migrations
 * 4. Restore data or seed fresh data
 * 
 * Usage: node scripts/setup-database.js [option]
 * Options: backup, reset, migrate, restore, seed
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const SEED_DIR = path.join(__dirname, '..', 'prisma', 'seed-data');

async function backupAllTables() {
  console.log('💾 Backing up all tables...\n');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tables = [
    'users', 'categories', 'expenses', 'income_sources', 
    'goals', 'deadlines', 'wishlist_items', 'account_statements'
  ];
  
  const backups = {};
  
  for (const table of tables) {
    try {
      const data = await prisma.$queryRawUnsafe(`SELECT * FROM ${table}`);
      const backupFile = `${table}_backup_${timestamp}.json`;
      const backupPath = path.join(BACKUP_DIR, backupFile);
      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
      backups[table] = { file: backupFile, count: data.length };
      console.log(`  ✅ ${table}: ${data.length} records → ${backupFile}`);
    } catch (error) {
      console.log(`  ⚠️  ${table}: ${error.message}`);
      backups[table] = { file: null, count: 0, error: error.message };
    }
  }
  
  // Save backup manifest
  const manifestPath = path.join(BACKUP_DIR, `backup_manifest_${timestamp}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp,
    backups
  }, null, 2));
  
  console.log(`\n✅ Backup complete! Manifest: ${manifestPath}`);
  return { timestamp, manifestPath, backups };
}

async function resetDatabase() {
  console.log('🗑️  Resetting database (truncating all tables)...\n');
  
  const tables = [
    'transactions', 'account_statements', 'expenses', 'income_sources',
    'goals', 'deadlines', 'wishlist_items', 'categories', 'users'
  ];
  
  // Disable foreign key checks temporarily
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table}`);
      console.log(`  ✅ Truncated ${table}`);
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log(`  ⚠️  ${table} doesn't exist (OK)`);
      } else {
        console.log(`  ❌ ${table}: ${error.message}`);
      }
    }
  }
  
  // Re-enable foreign key checks
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  
  console.log('\n✅ Database reset complete!');
}

async function runMigrations() {
  console.log('🔄 Running Prisma migrations...\n');
  
  try {
    console.log('  Running: npx prisma migrate deploy');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('\n  ✅ Migrations applied');
    
    console.log('\n  Running: npx prisma generate');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('\n  ✅ Prisma client generated');
    
    return true;
  } catch (error) {
    console.error('\n  ❌ Migration failed:', error.message);
    return false;
  }
}

async function restoreFromBackup(manifestPath) {
  console.log('📥 Restoring from backup...\n');
  
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest file not found: ${manifestPath}`);
    return false;
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`  Restoring backup from ${manifest.timestamp}\n`);
  
  for (const [table, info] of Object.entries(manifest.backups)) {
    if (!info.file || info.count === 0) {
      console.log(`  ⏭️  Skipping ${table} (no data)`);
      continue;
    }
    
    try {
      const backupPath = path.join(BACKUP_DIR, info.file);
      if (!fs.existsSync(backupPath)) {
        console.log(`  ⚠️  ${table}: Backup file not found`);
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      
      if (data.length === 0) {
        console.log(`  ⏭️  ${table}: No data to restore`);
        continue;
      }
      
      // For now, just log - actual restore would need table-specific logic
      console.log(`  📦 ${table}: ${data.length} records ready to restore`);
      // TODO: Implement actual restore logic based on table structure
      
    } catch (error) {
      console.log(`  ❌ ${table}: ${error.message}`);
    }
  }
  
  console.log('\n⚠️  Restore functionality needs table-specific implementation');
  console.log('   For now, use the migrate-to-transactions.js script after migration');
  return true;
}

async function seedDatabase() {
  console.log('🌱 Seeding database...\n');
  
  // Check if seed data directory exists
  if (!fs.existsSync(SEED_DIR)) {
    console.log('  ⚠️  Seed data directory not found, creating basic seed...');
    // Create basic seed data
    const basicSeed = {
      users: [],
      categories: [
        { name: 'Food & Dining', type: 'EXPENSE', isDefault: true },
        { name: 'Transportation', type: 'EXPENSE', isDefault: true },
        { name: 'Shopping', type: 'EXPENSE', isDefault: true },
        { name: 'Salary', type: 'INCOME', isDefault: true },
        { name: 'Freelance', type: 'INCOME', isDefault: true },
      ]
    };
    
    if (!fs.existsSync(SEED_DIR)) {
      fs.mkdirSync(SEED_DIR, { recursive: true });
    }
    fs.writeFileSync(
      path.join(SEED_DIR, 'basic-seed.json'),
      JSON.stringify(basicSeed, null, 2)
    );
  }
  
  console.log('  ✅ Seed data ready');
  console.log('  ⚠️  Manual seeding required - see prisma/seed.js');
  
  return true;
}

async function main() {
  const option = process.argv[2] || 'help';
  
  console.log('🗄️  Database Setup Script\n');
  console.log('='.repeat(50));
  
  switch (option) {
    case 'backup':
      await backupAllTables();
      break;
      
    case 'reset':
      const confirm = process.argv[3];
      if (confirm !== '--yes') {
        console.log('⚠️  WARNING: This will delete all data!');
        console.log('   Run with --yes flag to confirm: node scripts/setup-database.js reset --yes');
        break;
      }
      await resetDatabase();
      break;
      
    case 'migrate':
      await runMigrations();
      break;
      
    case 'restore':
      const manifestPath = process.argv[3];
      if (!manifestPath) {
        console.log('❌ Please provide manifest path: node scripts/setup-database.js restore <manifest-path>');
        break;
      }
      await restoreFromBackup(manifestPath);
      break;
      
    case 'seed':
      await seedDatabase();
      break;
      
    case 'full':
      console.log('🚀 Running full setup: backup → reset → migrate → seed\n');
      await backupAllTables();
      console.log('\n');
      await resetDatabase();
      console.log('\n');
      const migrated = await runMigrations();
      if (migrated) {
        console.log('\n');
        await seedDatabase();
      }
      break;
      
    default:
      console.log('Usage: node scripts/setup-database.js [option]');
      console.log('\nOptions:');
      console.log('  backup     - Backup all tables');
      console.log('  reset      - Truncate all tables (use --yes to confirm)');
      console.log('  migrate    - Run Prisma migrations');
      console.log('  restore    - Restore from backup manifest');
      console.log('  seed       - Prepare seed data');
      console.log('  full       - Run: backup → reset → migrate → seed');
      break;
  }
  
  await prisma.$disconnect();
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});

