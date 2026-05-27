-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('LEND_RETURN', 'BORROW_REPAY', 'EXPENSE_REFUND', 'OTHER');

-- CreateTable
CREATE TABLE "transaction_settlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "type" "SettlementType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_settlement_members" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "transaction_settlement_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_settlement_members_transactionId_key" ON "transaction_settlement_members"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_settlements_userId_idx" ON "transaction_settlements"("userId");

-- CreateIndex
CREATE INDEX "transaction_settlements_userId_createdAt_idx" ON "transaction_settlements"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "transaction_settlement_members_settlementId_idx" ON "transaction_settlement_members"("settlementId");

-- AddForeignKey
ALTER TABLE "transaction_settlements" ADD CONSTRAINT "transaction_settlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_settlement_members" ADD CONSTRAINT "transaction_settlement_members_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "transaction_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_settlement_members" ADD CONSTRAINT "transaction_settlement_members_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
