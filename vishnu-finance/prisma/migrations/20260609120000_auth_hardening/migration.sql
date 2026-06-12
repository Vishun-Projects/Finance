-- OTP: add hash columns (safe if legacy `otp` column never existed)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otpHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otpLockedUntil" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'otp'
  ) THEN
    UPDATE "users" SET "otpHash" = NULL WHERE "otp" IS NOT NULL;
    ALTER TABLE "users" DROP COLUMN "otp";
  END IF;
END $$;

-- Refresh token rotation
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_oauth_provider_id_key"
    ON "users"("oauthProvider", "oauthId")
    WHERE "oauthProvider" IS NOT NULL AND "oauthId" IS NOT NULL;
