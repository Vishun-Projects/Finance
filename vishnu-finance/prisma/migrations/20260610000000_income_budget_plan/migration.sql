-- CreateTable
CREATE TABLE "income_budget_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My budget',
    "templateId" TEXT NOT NULL DEFAULT '50-30-20',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_budget_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_budget_buckets" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'needs',
    "mapFrom" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "income_budget_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "income_budget_plans_userId_isActive_idx" ON "income_budget_plans"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "income_budget_buckets_planId_key_key" ON "income_budget_buckets"("planId", "key");

-- AddForeignKey
ALTER TABLE "income_budget_plans" ADD CONSTRAINT "income_budget_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_budget_buckets" ADD CONSTRAINT "income_budget_buckets_planId_fkey" FOREIGN KEY ("planId") REFERENCES "income_budget_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
