-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'SUPERUSER');

-- CreateEnum
CREATE TYPE "public"."DocumentSourceType" AS ENUM ('USER_UPLOAD', 'BANK_STATEMENT', 'PORTAL_RESOURCE', 'SYSTEM', 'SUPER_DOCUMENT');

-- CreateEnum
CREATE TYPE "public"."DocumentVisibility" AS ENUM ('PRIVATE', 'ORGANIZATION', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."AdvisorMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "public"."CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "public"."DeadlineFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."DeadlineStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."SalaryChangeType" AS ENUM ('NEW_JOB', 'PROMOTION', 'TRANSFER', 'COMPANY_CHANGE', 'LOCATION_CHANGE', 'DEPARTMENT_CHANGE', 'SALARY_REVISION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('PERSON', 'STORE');

-- CreateEnum
CREATE TYPE "public"."TransactionCategory" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."UserAccountStatus" AS ENUM ('ACTIVE', 'FROZEN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."AuditSeverity" AS ENUM ('INFO', 'WARN', 'ALERT');

-- CreateEnum
CREATE TYPE "public"."SuperDocumentCategory" AS ENUM ('INCOME_TAX', 'INVESTMENT', 'INSURANCE', 'RETIREMENT', 'DEBT_MANAGEMENT', 'BUDGETING', 'SAVINGS', 'OTHER');

-- CreateTable
CREATE TABLE "public"."global_design_settings" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "primaryColor" TEXT NOT NULL DEFAULT '250 85% 40%',
    "surfaceColor" TEXT NOT NULL DEFAULT '240 5% 97%',
    "accentColor" TEXT NOT NULL DEFAULT '240 4.8% 95.9%',
    "borderColor" TEXT NOT NULL DEFAULT '240 5.9% 90%',
    "fontFamilyBody" TEXT NOT NULL DEFAULT 'Inter',
    "fontFamilyHeading" TEXT NOT NULL DEFAULT 'Inter',
    "baseFontSize" INTEGER NOT NULL DEFAULT 16,
    "borderRadius" TEXT NOT NULL DEFAULT '0.5rem',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_design_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "navigationLayout" TEXT NOT NULL DEFAULT 'sidebar',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "colorScheme" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "oauthProvider" VARCHAR(50),
    "oauthId" VARCHAR(255),
    "name" TEXT,
    "avatarUrl" TEXT,
    "gender" "public"."Gender",
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "pincode" TEXT,
    "occupation" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "status" "public"."UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CategoryType" NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "parentCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."merchant_categories" (
    "id" TEXT NOT NULL,
    "merchantName" VARCHAR(255) NOT NULL,
    "normalizedName" VARCHAR(255) NOT NULL,
    "categoryName" VARCHAR(255),
    "categoryId" TEXT,
    "confidence" DECIMAL(3,2),
    "source" VARCHAR(50),
    "lookupDate" TIMESTAMP(3),
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deadlines" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "public"."DeadlineFrequency",
    "status" "public"."DeadlineStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "accountDetails" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "completedDate" TIMESTAMP(3),
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."goals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" DECIMAL(10,2) NOT NULL,
    "currentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "targetDate" TIMESTAMP(3),
    "priority" "public"."GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."goal_contributions" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."salary_structures" (
    "id" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "allowances" TEXT,
    "deductions" TEXT,
    "employerContributions" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "location" TEXT,
    "department" TEXT,
    "grade" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."salary_history" (
    "id" TEXT NOT NULL,
    "salaryStructureId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "allowances" TEXT,
    "deductions" TEXT,
    "employerContributions" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "location" TEXT,
    "department" TEXT,
    "grade" TEXT,
    "changeType" "public"."SalaryChangeType" NOT NULL,
    "changeReason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."super_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."SuperDocumentCategory" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "visibility" "public"."DocumentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "processedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."advisor_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisor_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."advisor_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "public"."AdvisorMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."upi_field_mappings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "fieldMap" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upi_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entity_mappings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "mappedNames" JSONB NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "creditAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "debitAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "financialCategory" "public"."TransactionCategory" NOT NULL DEFAULT 'EXPENSE',
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "bankCode" TEXT,
    "transactionId" TEXT,
    "accountNumber" TEXT,
    "transferType" TEXT,
    "personName" TEXT,
    "upiId" TEXT,
    "branch" TEXT,
    "store" TEXT,
    "rawData" JSONB,
    "balance" DECIMAL(12,2),
    "isPartialData" BOOLEAN NOT NULL DEFAULT false,
    "hasInvalidDate" BOOLEAN NOT NULL DEFAULT false,
    "hasZeroAmount" BOOLEAN NOT NULL DEFAULT false,
    "parsingMethod" TEXT,
    "parsingConfidence" DOUBLE PRECISION,
    "rawParsingData" JSONB,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "deletedById" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "checksum" TEXT,
    "visibility" "public"."DocumentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "sourceType" "public"."DocumentSourceType" NOT NULL DEFAULT 'USER_UPLOAD',
    "sourceReference" TEXT,
    "bankCode" TEXT,
    "parsedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bank_field_mappings" (
    "id" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "mappedTo" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mappingConfig" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "severity" "public"."AuditSeverity" NOT NULL DEFAULT 'INFO',
    "targetUserId" TEXT,
    "targetResource" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "public"."user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "categories_userId_idx" ON "public"."categories"("userId");

-- CreateIndex
CREATE INDEX "categories_parentCategoryId_idx" ON "public"."categories"("parentCategoryId");

-- CreateIndex
CREATE INDEX "merchant_categories_normalizedName_idx" ON "public"."merchant_categories"("normalizedName");

-- CreateIndex
CREATE INDEX "merchant_categories_categoryId_idx" ON "public"."merchant_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_categories_normalizedName_key" ON "public"."merchant_categories"("normalizedName");

-- CreateIndex
CREATE INDEX "deadlines_userId_idx" ON "public"."deadlines"("userId");

-- CreateIndex
CREATE INDEX "goals_userId_idx" ON "public"."goals"("userId");

-- CreateIndex
CREATE INDEX "goal_contributions_goalId_idx" ON "public"."goal_contributions"("goalId");

-- CreateIndex
CREATE INDEX "salary_structures_userId_idx" ON "public"."salary_structures"("userId");

-- CreateIndex
CREATE INDEX "salary_history_salaryStructureId_idx" ON "public"."salary_history"("salaryStructureId");

-- CreateIndex
CREATE INDEX "salary_history_userId_idx" ON "public"."salary_history"("userId");

-- CreateIndex
CREATE INDEX "super_documents_uploadedById_idx" ON "public"."super_documents"("uploadedById");

-- CreateIndex
CREATE INDEX "super_documents_category_idx" ON "public"."super_documents"("category");

-- CreateIndex
CREATE INDEX "advisor_conversations_userId_idx" ON "public"."advisor_conversations"("userId");

-- CreateIndex
CREATE INDEX "advisor_messages_conversationId_idx" ON "public"."advisor_messages"("conversationId");

-- CreateIndex
CREATE INDEX "upi_field_mappings_userId_idx" ON "public"."upi_field_mappings"("userId");

-- CreateIndex
CREATE INDEX "entity_mappings_userId_idx" ON "public"."entity_mappings"("userId");

-- CreateIndex
CREATE INDEX "entity_mappings_userId_entityType_idx" ON "public"."entity_mappings"("userId", "entityType");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "public"."transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_idx" ON "public"."transactions"("userId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_financialCategory_idx" ON "public"."transactions"("userId", "financialCategory");

-- CreateIndex
CREATE INDEX "transactions_categoryId_idx" ON "public"."transactions"("categoryId");

-- CreateIndex
CREATE INDEX "transactions_subcategoryId_idx" ON "public"."transactions"("subcategoryId");

-- CreateIndex
CREATE INDEX "transactions_documentId_idx" ON "public"."transactions"("documentId");

-- CreateIndex
CREATE INDEX "documents_ownerId_idx" ON "public"."documents"("ownerId");

-- CreateIndex
CREATE INDEX "documents_uploadedById_idx" ON "public"."documents"("uploadedById");

-- CreateIndex
CREATE INDEX "documents_deletedById_idx" ON "public"."documents"("deletedById");

-- CreateIndex
CREATE INDEX "bank_field_mappings_bankCode_isActive_idx" ON "public"."bank_field_mappings"("bankCode", "isActive");

-- CreateIndex
CREATE INDEX "bank_field_mappings_createdById_idx" ON "public"."bank_field_mappings"("createdById");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "public"."audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_event_idx" ON "public"."audit_logs"("event");

-- CreateIndex
CREATE INDEX "audit_logs_targetUserId_idx" ON "public"."audit_logs"("targetUserId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."merchant_categories" ADD CONSTRAINT "merchant_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deadlines" ADD CONSTRAINT "deadlines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."goal_contributions" ADD CONSTRAINT "goal_contributions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_structures" ADD CONSTRAINT "salary_structures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_history" ADD CONSTRAINT "salary_history_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "public"."salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_history" ADD CONSTRAINT "salary_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."super_documents" ADD CONSTRAINT "super_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."advisor_conversations" ADD CONSTRAINT "advisor_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."advisor_messages" ADD CONSTRAINT "advisor_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."advisor_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."upi_field_mappings" ADD CONSTRAINT "upi_field_mappings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entity_mappings" ADD CONSTRAINT "entity_mappings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_field_mappings" ADD CONSTRAINT "bank_field_mappings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
