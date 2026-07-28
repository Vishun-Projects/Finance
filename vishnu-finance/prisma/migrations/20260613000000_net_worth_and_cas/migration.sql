-- Idempotent: safe to run in SQL editor even if objects already exist.

DO $$ BEGIN
  CREATE TYPE "AssetType" AS ENUM ('BANK_ACCOUNT', 'CASH', 'INVESTMENT', 'PROPERTY', 'GOLD', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LiabilityType" AS ENUM ('LOAN', 'CREDIT_CARD', 'MORTGAGE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "user_assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL DEFAULT 'OTHER',
    "value" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "asOfDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_liabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LiabilityType" NOT NULL DEFAULT 'OTHER',
    "balance" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "asOfDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_liabilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cas_uploads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isLikelyCas" BOOLEAN NOT NULL DEFAULT false,
    "folioCount" INTEGER NOT NULL DEFAULT 0,
    "holderName" TEXT,
    "pan" TEXT,
    "statementDate" TEXT,
    "registrar" TEXT,
    "parseWarning" TEXT,
    "totalValue" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cas_uploads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cas_holdings" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "folio" TEXT,
    "units" DECIMAL(18,4),
    "nav" DECIMAL(14,4),
    "value" DECIMAL(14,2),
    "isin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cas_holdings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_assets_userId_idx" ON "user_assets"("userId");
CREATE INDEX IF NOT EXISTS "user_liabilities_userId_idx" ON "user_liabilities"("userId");
CREATE INDEX IF NOT EXISTS "cas_uploads_userId_createdAt_idx" ON "cas_uploads"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "cas_holdings_userId_idx" ON "cas_holdings"("userId");
CREATE INDEX IF NOT EXISTS "cas_holdings_uploadId_idx" ON "cas_holdings"("uploadId");

DO $$ BEGIN
  ALTER TABLE "user_assets" ADD CONSTRAINT "user_assets_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_liabilities" ADD CONSTRAINT "user_liabilities_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cas_uploads" ADD CONSTRAINT "cas_uploads_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cas_holdings" ADD CONSTRAINT "cas_holdings_uploadId_fkey"
    FOREIGN KEY ("uploadId") REFERENCES "cas_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cas_holdings" ADD CONSTRAINT "cas_holdings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
