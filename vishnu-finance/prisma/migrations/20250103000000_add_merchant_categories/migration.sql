-- CreateTable
CREATE TABLE `merchant_categories` (
    `id` VARCHAR(191) NOT NULL,
    `merchantName` VARCHAR(255) NOT NULL,
    `normalizedName` VARCHAR(255) NOT NULL,
    `categoryName` VARCHAR(255) NULL,
    `categoryId` VARCHAR(191) NULL,
    `confidence` DECIMAL(3, 2) NULL,
    `source` VARCHAR(50) NULL,
    `lookupDate` DATETIME(3) NULL,
    `hitCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `merchant_categories_normalizedName_key`(`normalizedName`),
    INDEX `merchant_categories_normalizedName_idx`(`normalizedName`),
    INDEX `merchant_categories_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `merchant_categories` ADD CONSTRAINT `merchant_categories_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

