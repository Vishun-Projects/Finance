-- CreateEnum
CREATE TABLE IF NOT EXISTS `EntityType` (
  `value` ENUM('PERSON', 'STORE') NOT NULL,
  PRIMARY KEY (`value`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `entity_mappings` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `canonicalName` VARCHAR(191) NOT NULL,
  `mappedNames` TEXT NOT NULL,
  `entityType` ENUM('PERSON', 'STORE') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `entity_mappings_userId_fkey` (`userId`),
  INDEX `entity_mappings_userId_entityType_idx` (`userId`, `entityType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `entity_mappings` ADD CONSTRAINT `entity_mappings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

