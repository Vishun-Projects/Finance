-- Add missing store column and verify all UPI fields exist
-- This migration ensures income_sources and expenses tables have all required columns
-- Note: Columns are added with error handling in the script

-- Add store column to income_sources
ALTER TABLE `income_sources` ADD COLUMN `store` VARCHAR(191) NULL;

-- Add UPI fields to income_sources
ALTER TABLE `income_sources` ADD COLUMN `upiId` VARCHAR(191) NULL;
ALTER TABLE `income_sources` ADD COLUMN `branch` VARCHAR(191) NULL;
ALTER TABLE `income_sources` ADD COLUMN `personName` VARCHAR(191) NULL;
ALTER TABLE `income_sources` ADD COLUMN `rawData` TEXT NULL;

-- Add store column to expenses
ALTER TABLE `expenses` ADD COLUMN `store` VARCHAR(191) NULL;

-- Add UPI fields to expenses
ALTER TABLE `expenses` ADD COLUMN `upiId` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD COLUMN `branch` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD COLUMN `personName` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD COLUMN `rawData` TEXT NULL;

