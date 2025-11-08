# Database Migration Guide

This guide walks you through migrating to the new Transaction model while ensuring all APIs work correctly.

## Prerequisites

1. **Stop your development server** (if running)
2. Ensure you have database credentials in `.env`
3. Backup your current data (recommended)

## Step 1: Test Current APIs

Before migration, verify APIs handle missing Transaction table gracefully:

```bash
# Make sure dev server is running
npm run dev

# In another terminal, test APIs
node scripts/test-apis.js
```

All APIs should return gracefully (empty results or fallback messages) even if Transaction table doesn't exist.

## Step 2: Backup Existing Data

**Option A: Automatic Backup**
```bash
node scripts/setup-database.js backup
```

This creates backups in `backups/` directory with timestamp.

**Option B: Manual Backup (MySQL)**
```bash
mysqldump -u your_user -p vishnu_finance > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Step 3: Choose Migration Path

### Path A: Fresh Start (Recommended for Testing)

This will delete all existing data and start fresh:

```bash
# 1. Backup (optional but recommended)
node scripts/setup-database.js backup

# 2. Reset database
node scripts/setup-database.js reset --yes

# 3. Run migrations (creates Transaction table)
npx prisma migrate dev --name add_transaction_model

# 4. Generate Prisma client
npx prisma generate

# 5. Verify migration
node scripts/test-apis.js
```

### Path B: Preserve Data

This keeps existing data and migrates it to Transaction model:

```bash
# 1. Backup everything
node scripts/setup-database.js backup

# 2. Run migration (creates Transaction table, keeps existing tables)
npx prisma migrate dev --name add_transaction_model

# 3. Generate Prisma client
npx prisma generate

# 4. Migrate existing data
node scripts/migrate-to-transactions.js

# 5. Verify all APIs
node scripts/test-apis.js
```

## Step 4: Verify APIs

After migration, test all endpoints:

```bash
# Start dev server
npm run dev

# In another terminal
node scripts/test-apis.js
```

### Manual API Testing Checklist

- [ ] `GET /api/dashboard-simple` - Should show credits/debits
- [ ] `GET /api/income` - Should query Transaction model
- [ ] `GET /api/expenses` - Should query Transaction model  
- [ ] `GET /api/transactions/manage` - Should show all transactions
- [ ] `POST /api/import-bank-statement` - Should create Transaction records
- [ ] `GET /api/goals` - Should work
- [ ] `GET /api/deadlines` - Should work
- [ ] `GET /api/categories` - Should work

## Step 5: Test Import Flow

1. Upload a bank statement PDF
2. Verify it creates Transaction records (not Expense/IncomeSource)
3. Check that credits/debits are properly set
4. Verify financialCategory is assigned correctly

## Troubleshooting

### Error: "Table doesn't exist"

If you see errors about Transaction table not existing:

1. Check migration status: `npx prisma migrate status`
2. Run migration: `npx prisma migrate deploy`
3. Regenerate client: `npx prisma generate`
4. Restart dev server

### Error: "Cannot read properties of undefined (reading 'aggregate')"

This means Prisma client hasn't been regenerated:

```bash
npx prisma generate
# Restart dev server
```

### Migration Fails

If migration fails:

1. Check database connection in `.env`
2. Review migration SQL in `prisma/migrations/`
3. Manually fix issues in migration file
4. Try again: `npx prisma migrate deploy`

### APIs Return Empty Data

This is expected if Transaction table is empty. After migration:
- New imports will create Transaction records
- Use `migrate-to-transactions.js` to convert existing data

## Rollback (if needed)

If you need to rollback:

```bash
# Option 1: Restore from backup
mysql -u your_user -p vishnu_finance < backup_YYYYMMDD_HHMMSS.sql

# Option 2: Reset and restore data manually
node scripts/setup-database.js reset --yes
# Then manually restore from backups/
```

## Data Migration Details

The `migrate-to-transactions.js` script:

1. Reads all Expense records → Creates Transaction with:
   - `debitAmount` = expense amount
   - `creditAmount` = 0
   - `financialCategory` = 'EXPENSE'

2. Reads all IncomeSource records → Creates Transaction with:
   - `creditAmount` = income amount  
   - `debitAmount` = 0
   - `financialCategory` = 'INCOME'

3. Preserves all bank-specific fields (bankCode, transactionId, etc.)
4. Marks original records for deletion (doesn't delete, just marks)

## Post-Migration Checklist

- [ ] All APIs tested and working
- [ ] Dashboard shows credits/debits correctly
- [ ] Import creates Transaction records
- [ ] Existing data migrated (if Path B)
- [ ] UI displays new terminology
- [ ] No errors in console/logs

## Next Steps

After successful migration:

1. Update frontend components to use new Transaction model
2. Remove old Expense/IncomeSource models (optional, can keep for compatibility)
3. Update documentation
4. Deploy to production (after thorough testing)

