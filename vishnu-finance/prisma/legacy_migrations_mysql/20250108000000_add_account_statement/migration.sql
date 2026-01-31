-- CreateTable
CREATE TABLE `account_statements` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `bankCode` VARCHAR(191) NOT NULL,
    `statementStartDate` DATETIME(3) NOT NULL,
    `statementEndDate` DATETIME(3) NOT NULL,
    `openingBalance` DECIMAL(12, 2) NOT NULL,
    `closingBalance` DECIMAL(12, 2) NOT NULL,
    `totalDebits` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `totalCredits` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `transactionCount` INTEGER NOT NULL DEFAULT 0,
    `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `importedBy` VARCHAR(191) NOT NULL,
    `metadata` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `account_statements_userId_fkey` ON `account_statements`(`userId`);

-- CreateIndex
CREATE INDEX `account_statements_userId_accountNumber_bankCode_idx` ON `account_statements`(`userId`, `accountNumber`, `bankCode`);

-- CreateIndex
CREATE INDEX `account_statements_userId_accountNumber_startDate_idx` ON `account_statements`(`userId`, `accountNumber`, `statementStartDate`);

-- AddForeignKey
ALTER TABLE `account_statements` ADD CONSTRAINT `account_statements_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

