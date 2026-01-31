-- Add role column to users with default
ALTER TABLE `users`
  ADD COLUMN `role` ENUM('USER', 'SUPERUSER') NOT NULL DEFAULT 'USER';

-- Create documents table
CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(191) NOT NULL,
  `ownerId` VARCHAR(191) NULL,
  `uploadedById` VARCHAR(191) NOT NULL,
  `storageKey` VARCHAR(191) NOT NULL,
  `originalName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `fileSize` INT NULL,
  `checksum` VARCHAR(191) NULL,
  `visibility` ENUM('PRIVATE', 'ORGANIZATION', 'PUBLIC') NOT NULL DEFAULT 'PRIVATE',
  `sourceType` ENUM('USER_UPLOAD', 'BANK_STATEMENT', 'PORTAL_RESOURCE', 'SYSTEM') NOT NULL DEFAULT 'USER_UPLOAD',
  `sourceReference` VARCHAR(191) NULL,
  `bankCode` VARCHAR(191) NULL,
  `parsedAt` DATETIME(3) NULL,
  `metadata` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `documents_ownerId_idx`(`ownerId`),
  INDEX `documents_uploadedById_idx`(`uploadedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys for documents table
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ownerId_fkey`
    FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `documents`
  ADD CONSTRAINT `documents_uploadedById_fkey`
    FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create bank_field_mappings table
CREATE TABLE IF NOT EXISTS `bank_field_mappings` (
  `id` VARCHAR(191) NOT NULL,
  `bankCode` VARCHAR(191) NOT NULL,
  `fieldKey` VARCHAR(191) NOT NULL,
  `mappedTo` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `mappingConfig` TEXT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `bank_field_mappings_bankCode_active_idx`(`bankCode`, `isActive`),
  INDEX `bank_field_mappings_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key for bank_field_mappings
ALTER TABLE `bank_field_mappings`
  ADD CONSTRAINT `bank_field_mappings_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Link transactions to documents
ALTER TABLE `transactions`
  ADD COLUMN `documentId` VARCHAR(191) NULL,
  ADD INDEX `transactions_documentId_idx`(`documentId`);

ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_documentId_fkey`
    FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

