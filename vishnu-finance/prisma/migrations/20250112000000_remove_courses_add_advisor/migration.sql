-- Drop course-related tables
DROP TABLE IF EXISTS `module_progress`;
DROP TABLE IF EXISTS `course_progress`;
DROP TABLE IF EXISTS `modules`;
DROP TABLE IF EXISTS `courses`;

-- Add SUPER_DOCUMENT to DocumentSourceType enum
ALTER TABLE `documents` 
  MODIFY COLUMN `sourceType` ENUM('USER_UPLOAD','BANK_STATEMENT','PORTAL_RESOURCE','SYSTEM','SUPER_DOCUMENT') NOT NULL DEFAULT 'USER_UPLOAD';

-- Create SuperDocumentCategory enum and super_documents table
CREATE TABLE IF NOT EXISTS `super_documents` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `category` ENUM('INCOME_TAX','INVESTMENT','INSURANCE','RETIREMENT','DEBT_MANAGEMENT','BUDGETING','SAVINGS','OTHER') NOT NULL,
  `storageKey` VARCHAR(191) NOT NULL,
  `originalName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `fileSize` INT NULL,
  `uploadedById` VARCHAR(191) NOT NULL,
  `visibility` ENUM('PRIVATE','ORGANIZATION','PUBLIC') NOT NULL DEFAULT 'PUBLIC',
  `processedText` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `super_documents_uploadedById_idx`(`uploadedById`),
  INDEX `super_documents_category_idx`(`category`),
  CONSTRAINT `super_documents_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create AdvisorMessageRole enum and advisor tables
CREATE TABLE IF NOT EXISTS `advisor_conversations` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `advisor_conversations_userId_idx`(`userId`),
  CONSTRAINT `advisor_conversations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `advisor_messages` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `role` ENUM('USER','ASSISTANT') NOT NULL,
  `content` TEXT NOT NULL,
  `sources` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `advisor_messages_conversationId_idx`(`conversationId`),
  CONSTRAINT `advisor_messages_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `advisor_conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

