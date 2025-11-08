-- CreateEnum
CREATE TABLE IF NOT EXISTS `TransactionCategory` (
  `value` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`value`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `TransactionCategory` (`value`) VALUES ('INCOME'), ('EXPENSE'), ('TRANSFER'), ('INVESTMENT'), ('OTHER');

-- CreateTable
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NULL,
    `creditAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `debitAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `financialCategory` ENUM('INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER') NOT NULL DEFAULT 'EXPENSE',
    `categoryId` VARCHAR(191) NULL,
    `accountStatementId` VARCHAR(191) NULL,
    `bankCode` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `transferType` VARCHAR(191) NULL,
    `personName` VARCHAR(191) NULL,
    `upiId` VARCHAR(191) NULL,
    `branch` VARCHAR(191) NULL,
    `store` VARCHAR(191) NULL,
    `rawData` TEXT NULL,
    `balance` DECIMAL(12, 2) NULL,
    `notes` VARCHAR(191) NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transactions_userId_fkey`(`userId`),
    INDEX `transactions_userId_transactionDate_idx`(`userId`, `transactionDate`),
    INDEX `transactions_userId_financialCategory_idx`(`userId`, `financialCategory`),
    INDEX `transactions_accountStatementId_fkey`(`accountStatementId`),
    INDEX `transactions_categoryId_fkey`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: accountStatementId foreign key will be added when account_statements table exists

