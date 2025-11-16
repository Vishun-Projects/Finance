-- DropForeignKey
ALTER TABLE `categories` DROP FOREIGN KEY `categories_parentCategoryId_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_subcategoryId_fkey`;

-- DropIndex
DROP INDEX `categories_parentCategoryId_idx` ON `categories`;

-- DropIndex
DROP INDEX `transactions_subcategoryId_idx` ON `transactions`;

-- AlterTable
ALTER TABLE `audit_logs` MODIFY `event` varchar(64) NOT NULL,
    MODIFY `targetResource` varchar(255) NULL,
    MODIFY `message` varchar(255) NULL,
    MODIFY `metadata` longtext NULL,
    MODIFY `ipAddress` varchar(64) NULL,
    MODIFY `userAgent` varchar(255) NULL;

-- AlterTable
ALTER TABLE `categories` DROP COLUMN `parentCategoryId`;

-- AlterTable
ALTER TABLE `merchant_categories` MODIFY `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `transactions` DROP COLUMN `hasInvalidDate`,
    DROP COLUMN `hasZeroAmount`,
    DROP COLUMN `isPartialData`,
    DROP COLUMN `parsingConfidence`,
    DROP COLUMN `parsingMethod`,
    DROP COLUMN `rawParsingData`,
    DROP COLUMN `subcategoryId`;

-- AlterTable
ALTER TABLE `users` MODIFY `password` varchar(255) NULL;

-- CreateTable
CREATE TABLE `entitytype` (
    `value` ENUM('PERSON', 'STORE') NOT NULL,

    PRIMARY KEY (`value` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactioncategory` (
    `value` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`value` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_categories_name` ON `categories`(`name` ASC);

-- CreateIndex
CREATE INDEX `idx_categories_type_default` ON `categories`(`type` ASC, `isDefault` ASC);

-- CreateIndex
CREATE INDEX `idx_categories_user_id_type` ON `categories`(`userId` ASC, `type` ASC);

-- CreateIndex
CREATE INDEX `idx_deadlines_due_date_status` ON `deadlines`(`dueDate` ASC, `status` ASC);

-- CreateIndex
CREATE INDEX `idx_deadlines_recurring` ON `deadlines`(`isRecurring` ASC);

-- CreateIndex
CREATE INDEX `idx_deadlines_user_id_completed` ON `deadlines`(`userId` ASC, `isCompleted` ASC);

-- CreateIndex
CREATE INDEX `idx_deadlines_user_id_due_date` ON `deadlines`(`userId` ASC, `dueDate` ASC);

-- CreateIndex
CREATE INDEX `idx_deadlines_user_id_status` ON `deadlines`(`userId` ASC, `status` ASC);

-- CreateIndex
CREATE INDEX `idx_expenses_date_amount` ON `expenses`(`date` ASC, `amount` ASC);

-- CreateIndex
CREATE INDEX `idx_expenses_frequency` ON `expenses`(`frequency` ASC);

-- CreateIndex
CREATE INDEX `idx_expenses_recurring` ON `expenses`(`isRecurring` ASC);

-- CreateIndex
CREATE INDEX `idx_expenses_user_id_amount` ON `expenses`(`userId` ASC, `amount` ASC);

-- CreateIndex
CREATE INDEX `idx_expenses_user_id_category` ON `expenses`(`userId` ASC, `categoryId` ASC);

-- CreateIndex
CREATE INDEX `idx_expenses_user_id_date` ON `expenses`(`userId` ASC, `date` ASC);

-- CreateIndex
CREATE INDEX `idx_goals_current_amount` ON `goals`(`currentAmount` ASC);

-- CreateIndex
CREATE INDEX `idx_goals_target_amount` ON `goals`(`targetAmount` ASC);

-- CreateIndex
CREATE INDEX `idx_goals_user_id_active` ON `goals`(`userId` ASC, `isActive` ASC);

-- CreateIndex
CREATE INDEX `idx_goals_user_id_priority` ON `goals`(`userId` ASC, `priority` ASC);

-- CreateIndex
CREATE INDEX `idx_goals_user_id_target_date` ON `goals`(`userId` ASC, `targetDate` ASC);

-- CreateIndex
CREATE INDEX `idx_income_sources_frequency` ON `income_sources`(`frequency` ASC);

-- CreateIndex
CREATE INDEX `idx_income_sources_user_id_active` ON `income_sources`(`userId` ASC, `isActive` ASC);

-- CreateIndex
CREATE INDEX `idx_income_sources_user_id_amount` ON `income_sources`(`userId` ASC, `amount` ASC);

-- CreateIndex
CREATE INDEX `idx_income_sources_user_id_date` ON `income_sources`(`userId` ASC, `startDate` ASC);

-- CreateIndex
CREATE INDEX `idx_recurring_items_frequency` ON `recurring_items`(`frequency` ASC);

-- CreateIndex
CREATE INDEX `idx_recurring_items_next_due_date` ON `recurring_items`(`nextDueDate` ASC);

-- CreateIndex
CREATE INDEX `idx_recurring_items_user_id_active` ON `recurring_items`(`userId` ASC, `isActive` ASC);

-- CreateIndex
CREATE INDEX `idx_recurring_items_user_id_type` ON `recurring_items`(`userId` ASC, `type` ASC);

-- CreateIndex
CREATE INDEX `idx_refresh_tokens_expires_at` ON `refresh_tokens`(`expiresAt` ASC);

-- CreateIndex
CREATE INDEX `idx_refresh_tokens_token` ON `refresh_tokens`(`token` ASC);

-- CreateIndex
CREATE INDEX `idx_refresh_tokens_user_id_active` ON `refresh_tokens`(`userId` ASC, `isActive` ASC);

-- CreateIndex
CREATE INDEX `idx_salary_history_change_type` ON `salary_history`(`changeType` ASC);

-- CreateIndex
CREATE INDEX `idx_salary_history_effective_date` ON `salary_history`(`effectiveDate` ASC);

-- CreateIndex
CREATE INDEX `idx_salary_structure_base_salary` ON `salary_structures`(`baseSalary` ASC);

-- CreateIndex
CREATE INDEX `idx_salary_structure_user_id_active` ON `salary_structures`(`userId` ASC, `isActive` ASC);

-- CreateIndex
CREATE INDEX `idx_salary_structure_user_id_effective_date` ON `salary_structures`(`userId` ASC, `effectiveDate` ASC);

-- CreateIndex
CREATE UNIQUE INDEX `transactions_unique_key` ON `transactions`(`userId` ASC, `description` ASC, `creditAmount` ASC, `debitAmount` ASC, `transactionDate` ASC, `isDeleted` ASC);

-- CreateIndex
CREATE INDEX `idx_email_oauth` ON `users`(`email` ASC, `oauthProvider` ASC);

-- CreateIndex
CREATE INDEX `idx_oauth` ON `users`(`oauthProvider` ASC, `oauthId` ASC);

-- CreateIndex
CREATE INDEX `idx_users_created_at` ON `users`(`createdAt` ASC);

-- CreateIndex
CREATE INDEX `idx_users_email_active` ON `users`(`email` ASC, `isActive` ASC);

-- CreateIndex
CREATE INDEX `idx_users_last_login` ON `users`(`lastLogin` ASC);

-- CreateIndex
CREATE INDEX `idx_wishlist_estimated_cost` ON `wishlist_items`(`estimatedCost` ASC);

-- CreateIndex
CREATE INDEX `idx_wishlist_user_id_completed` ON `wishlist_items`(`userId` ASC, `isCompleted` ASC);

-- CreateIndex
CREATE INDEX `idx_wishlist_user_id_priority` ON `wishlist_items`(`userId` ASC, `priority` ASC);

-- CreateIndex
CREATE INDEX `idx_wishlist_user_id_target_date` ON `wishlist_items`(`userId` ASC, `targetDate` ASC);

-- RenameIndex
ALTER TABLE `income_sources` RENAME INDEX `income_sources_categoryId_fkey` TO `idx_income_sources_category_id`;

-- RenameIndex
ALTER TABLE `salary_history` RENAME INDEX `salary_history_salaryStructureId_fkey` TO `idx_salary_history_salary_structure_id`;

-- RenameIndex
ALTER TABLE `salary_history` RENAME INDEX `salary_history_userId_fkey` TO `idx_salary_history_user_id`;

