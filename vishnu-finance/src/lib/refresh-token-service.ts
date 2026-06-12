import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/db';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface IssuedRefreshToken {
  rawToken: string;
  familyId: string;
}

/** Create a new refresh token family (login / verify / OAuth). */
export async function issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
  const rawToken = generateRawToken();
  const familyId = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await (prisma as any).refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      familyId,
      expiresAt,
    },
  });

  return { rawToken, familyId };
}

export interface RotateResult {
  userId: string;
  rawToken: string;
  familyId: string;
}

/** Rotate refresh token; detect reuse and revoke entire family. */
export async function rotateRefreshToken(rawToken: string): Promise<RotateResult | null> {
  const tokenHash = hashToken(rawToken);
  const record = await (prisma as any).refreshToken.findFirst({
    where: { tokenHash },
  });

  if (!record) return null;

  if (record.revokedAt || record.expiresAt < new Date()) {
    await revokeRefreshFamily(record.familyId);
    return null;
  }

  const newRaw = generateRawToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await (prisma as any).$transaction([
    (prisma as any).refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    }),
    (prisma as any).refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: hashToken(newRaw),
        familyId: record.familyId,
        expiresAt,
      },
    }),
  ]);

  return { userId: record.userId, rawToken: newRaw, familyId: record.familyId };
}

export async function revokeRefreshFamily(familyId: string): Promise<void> {
  await (prisma as any).refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const record = await (prisma as any).refreshToken.findFirst({ where: { tokenHash } });
  if (record?.familyId) {
    await revokeRefreshFamily(record.familyId);
  }
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await (prisma as any).refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
