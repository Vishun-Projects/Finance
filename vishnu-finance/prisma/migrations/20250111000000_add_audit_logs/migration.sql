-- Create audit log table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `event` VARCHAR(64) NOT NULL,
  `severity` ENUM('INFO','WARN','ALERT') NOT NULL DEFAULT 'INFO',
  `targetUserId` VARCHAR(191) NULL,
  `targetResource` VARCHAR(255) NULL,
  `message` VARCHAR(255) NULL,
  `metadata` JSON NULL,
  `ipAddress` VARCHAR(64) NULL,
  `userAgent` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_actorId_idx`(`actorId`),
  INDEX `audit_logs_event_idx`(`event`),
  INDEX `audit_logs_targetUserId_idx`(`targetUserId`),
  INDEX `audit_logs_createdAt_idx`(`createdAt`),
  CONSTRAINT `audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `audit_logs_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed anomaly flag enum if not existing
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `status` ENUM('ACTIVE','FROZEN','SUSPENDED') NOT NULL DEFAULT 'ACTIVE';


