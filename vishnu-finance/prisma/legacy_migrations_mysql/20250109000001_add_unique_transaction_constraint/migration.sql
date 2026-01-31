-- Add unique constraint to prevent duplicate transactions
-- This ensures that even with concurrent imports, duplicates are prevented at database level

-- For MySQL, create a unique index on key fields
-- Note: We'll use a composite unique index that works with soft deletes
-- Since MySQL doesn't support partial unique indexes directly, we'll include isDeleted in the index
DROP INDEX IF EXISTS `transactions_unique_key` ON `transactions`;

CREATE UNIQUE INDEX IF NOT EXISTS `transactions_unique_key` ON `transactions` (
  `userId`,
  `description`(191),  -- utf8mb4-safe prefix length
  `creditAmount`,
  `debitAmount`,
  `transactionDate`,
  `isDeleted`
);

