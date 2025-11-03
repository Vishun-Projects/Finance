<!-- 2f40c9dd-6853-4d4f-b4c3-9b04e2506508 e1d83804-958c-4d58-b3f0-02d3796e1276 -->
# Exclude Soft-Deleted Records and Add Restore Functionality

## Overview

Update income, expenses, dashboard, and health pages to exclude soft-deleted transactions, and add restore functionality to the manage-transactions page.

## Implementation Steps

### 1. Update API Routes to Exclude Soft-Deleted Records

**Files to modify:**

- `vishnu-finance/src/app/api/income/route.ts` - Add `isDeleted: false` filter to all queries
- `vishnu-finance/src/app/api/expenses/route.ts` - Add `isDeleted: false` filter to all queries  
- `vishnu-finance/src/app/api/dashboard/route.ts` - Add `isDeleted: false` filter to income/expense queries
- `vishnu-finance/src/app/(app)/financial-health/page.tsx` - Ensure API calls exclude soft-deleted records

**Implementation:**

- Add `isDeleted: false` to all Prisma queries for Expense and IncomeSource models
- Ensure date range queries, aggregations, and counts all respect the `isDeleted` flag
- Update any `findMany`, `count`, `aggregate` operations

### 2. Add Restore API Endpoint

**New file:**

- `vishnu-finance/src/app/api/transactions/restore/route.ts`

**Implementation:**

- Create POST endpoint to restore soft-deleted transactions
- Accept `transactionIds` array or `filters` object (similar to delete route)
- Query both Expense and IncomeSource tables to identify transaction types
- Update `isDeleted: false` and clear `deletedAt` field
- Return count of restored transactions

### 3. Update Transaction Management Table Component

**File to modify:**

- `vishnu-finance/src/components/transaction-management-table.tsx`

**Implementation:**

- Add "Restore Selected" button next to delete button
- Add `handleRestoreSelected` and `handleRestoreFiltered` functions
- Create restore confirmation dialog (can reuse DeleteConfirmationDialog or create new)
- Add `restoring` state and `confirmRestore` function
- Call new `/api/transactions/restore` endpoint
- Filter UI to show deleted transactions separately or add toggle to show/hide them

### 4. Add Visual Indicators

**File to modify:**

- `vishnu-finance/src/components/transaction-management-table.tsx`

**Implementation:**

- Add filter toggle to show/hide deleted transactions
- Add visual distinction for deleted vs active transactions in the table
- Update restore button states (disabled when no deleted items selected)

## Notes

- All existing functionality remains intact
- Restore follows same pattern as delete (by IDs or by filters)
- Soft-deleted records are completely hidden from income, expenses, dashboard, and health pages
- Manage-transactions page allows full control with restore capability

### To-dos

- [ ] Add isDeleted: false filter to all queries in /api/income/route.ts
- [ ] Add isDeleted: false filter to all queries in /api/expenses/route.ts
- [ ] Add isDeleted: false filter to income/expense queries in /api/dashboard/route.ts
- [ ] Ensure financial-health page API calls exclude soft-deleted records
- [ ] Create /api/transactions/restore/route.ts endpoint to restore soft-deleted transactions
- [ ] Add restore buttons and confirmation dialog to transaction-management-table.tsx
- [ ] Add toggle to show/hide deleted transactions in manage-transactions UI