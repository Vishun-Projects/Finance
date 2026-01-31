-- Add soft-delete metadata to documents
ALTER TABLE `documents`
  ADD COLUMN `deletedById` VARCHAR(191) NULL,
  ADD COLUMN `deletedAt` DATETIME(3) NULL,
  ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE `documents`
  ADD CONSTRAINT `documents_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `documents_deletedById_idx` ON `documents`(`deletedById`);

