-- Add UPI fields to income_sources table
ALTER TABLE `income_sources` ADD COLUMN `upiId` VARCHAR(191) NULL;
ALTER TABLE `income_sources` ADD COLUMN `branch` VARCHAR(191) NULL;
ALTER TABLE `income_sources` ADD COLUMN `personName` VARCHAR(191) NULL;
ALTER TABLE `income_sources` ADD COLUMN `rawData` TEXT NULL;

-- Add UPI fields to expenses table
ALTER TABLE `expenses` ADD COLUMN `upiId` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD COLUMN `branch` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD COLUMN `personName` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD COLUMN `rawData` TEXT NULL;

-- Create upi_field_mappings table
CREATE TABLE `upi_field_mappings` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `ruleName` VARCHAR(191) NOT NULL,
  `pattern` TEXT NOT NULL,
  `fieldMap` TEXT NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `upi_field_mappings_userId_fkey` (`userId`),
  CONSTRAINT `upi_field_mappings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

