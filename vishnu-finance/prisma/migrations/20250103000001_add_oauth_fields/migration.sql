-- AlterTable: Add OAuth fields and make password nullable
ALTER TABLE `users` 
  ADD COLUMN `oauthProvider` VARCHAR(50) NULL,
  ADD COLUMN `oauthId` VARCHAR(255) NULL,
  MODIFY COLUMN `password` VARCHAR(255) NULL;

-- CreateIndex: Index for OAuth lookups
CREATE INDEX `idx_oauth` ON `users`(`oauthProvider`, `oauthId`);

-- CreateIndex: Index for email + OAuth provider lookups
CREATE INDEX `idx_email_oauth` ON `users`(`email`, `oauthProvider`);

