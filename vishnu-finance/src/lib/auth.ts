import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { prisma } from './db';
import { MailerService } from './mailer-service';
import { globalCache } from './cache-singleton';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

if (!JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
}

/** Short-lived access token (60 minutes). */
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60;
/** Legacy alias — refresh cookie max-age. */
export const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const JWT_EXPIRES_IN = ACCESS_TOKEN_MAX_AGE_SECONDS;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

export function getSuperuserEmail(): string {
  return process.env.SUPERUSER_EMAIL ?? 'vishun@finance.com';
}

export function getSuperuserPhone(): string {
  return process.env.SUPERUSER_PHONE ?? '';
}

/** @deprecated Use getSuperuserEmail() */
export const SUPERUSER_EMAIL = getSuperuserEmail();
/** @deprecated Use getSuperuserPhone() */
export const SUPERUSER_PHONE = getSuperuserPhone();

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Resolve user by email (exact match, then case-insensitive fallback). */
export async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const exact = await prisma.user.findUnique({ where: { email: normalized } });
  if (exact) return exact;

  return prisma.user.findFirst({
    where: { email: { equals: normalized, mode: 'insensitive' } },
  });
}

/** Deliver OTP via SMS (superuser), email, or dev console fallback. */
export async function deliverOtpToUser(email: string, otp: string): Promise<void> {
  const superEmail = normalizeEmail(getSuperuserEmail());
  const superPhone = getSuperuserPhone();
  const normalized = normalizeEmail(email);

  if (normalized === superEmail && superPhone) {
    const { N8nService } = await import('./n8n-service');
    const smsResult = await N8nService.triggerWorkflow('otp_phone_delivery', {
      email: normalized,
      otp,
      phone: superPhone,
      provider: 'twilio_sms',
    });
    if (smsResult !== null) return;
  }

  try {
    await MailerService.sendOTP(normalized, otp);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Auth] SMTP unavailable — OTP logged for dev:', normalized, otp);
      return;
    }
    throw error;
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  name?: string | null;
  role?: string;
}

interface RefreshTokenPayload {
  userId: string;
}

export class AuthService {
  private static CACHE_TTL = 300000;

  static readonly ACCESS_TOKEN_MAX_AGE_SECONDS = ACCESS_TOKEN_MAX_AGE_SECONDS;

  static invalidateUserCache(userId: string): void {
    globalCache.delete(`auth_user:${userId}`);
  }

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static validatePassword(password: string): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return 'Password must contain at least one letter and one number';
    }
    return null;
  }

  static async generateOTP(email: string): Promise<string> {
    const normalized = normalizeEmail(email);
    const user = await findUserByEmail(normalized);
    if (!user) {
      throw new Error('User not found');
    }

    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpHash = await bcrypt.hash(otp, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        otpLockedUntil: null,
      },
    });

    return otp;
  }

  static async verifyOTP(email: string, otp: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return false;

    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
      return false;
    }

    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return false;
    }

    const valid = await bcrypt.compare(otp, user.otpHash);
    if (!valid) {
      const attempts = (user.otpAttempts ?? 0) + 1;
      const locked = attempts >= OTP_MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpAttempts: attempts,
          otpLockedUntil: locked ? new Date(Date.now() + OTP_LOCKOUT_MS) : null,
        },
      });
      return false;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpLockedUntil: null,
        isVerified: true,
        status: 'ACTIVE',
      },
    });

    return true;
  }

  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET!, { expiresIn: AUTH_COOKIE_MAX_AGE_SECONDS });
  }

  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET!) as JWTPayload;
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET!) as RefreshTokenPayload;
    } catch {
      return null;
    }
  }

  static generateToken(payload: JWTPayload): string {
    return this.generateAccessToken(payload);
  }

  static verifyToken(token: string): JWTPayload | null {
    return this.verifyAccessToken(token);
  }

  static async registerUser(email: string, password: string, name?: string) {
    email = normalizeEmail(email);
    const passwordError = this.validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      if (existingUser.oauthProvider && !existingUser.password) {
        throw new Error('This email is already registered with Google. Please use "Sign in with Google" instead.');
      }
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await this.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: 'USER',
        isVerified: false,
      },
    });

    const otp = await this.generateOTP(email);
    await deliverOtpToUser(email, otp);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
      },
      requiresVerification: true,
    };
  }

  static async loginUser(email: string, password: string) {
    email = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { preferences: true },
    }) ?? await findUserByEmail(email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.password) {
      if (user.oauthProvider) {
        throw new Error(
          `This account uses ${user.oauthProvider === 'google' ? 'Google' : user.oauthProvider} sign-in. Use Continue with Google or Login with OTP.`,
        );
      }
      throw new Error('Invalid email or password');
    }

    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    if (!user.isVerified) {
      const otp = await this.generateOTP(user.email);
      await deliverOtpToUser(user.email, otp);
      return { requiresVerification: true, email: user.email };
    }

    if (!user.isActive) {
      throw new Error('Account is inactive. Please contact support.');
    }

    const token = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        state: user.state,
        country: user.country,
        pincode: user.pincode,
        occupation: user.occupation,
        bio: user.bio,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role,
      },
      token,
    };
  }

  static async getUserFromToken(token: string) {
    const payload = this.verifyToken(token);
    if (!payload) return null;

    const cacheKey = `auth_user:${payload.userId}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          gender: true,
          phone: true,
          dateOfBirth: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          country: true,
          pincode: true,
          occupation: true,
          bio: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          role: true,
          status: true,
        },
      });

      if (!user) return null;
      globalCache.set(cacheKey, user, this.CACHE_TTL);
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('Unknown field `status`')) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            gender: true,
            phone: true,
            dateOfBirth: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            country: true,
            pincode: true,
            occupation: true,
            bio: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            role: true,
          },
        });
        if (user) globalCache.set(cacheKey, user, this.CACHE_TTL);
        return user;
      }
      throw error;
    }
  }

  static async findOrCreateOAuthUser(
    oAuthUser: { email: string; name: string; sub: string; picture?: string },
    provider: string,
  ): Promise<
    | { user: Awaited<ReturnType<typeof prisma.user.findUnique>> & object }
    | { requiresLink: true; email: string; provider: string; sub: string; picture?: string }
  > {
    const { email, name, sub, picture } = oAuthUser;
    const normalizedEmail = normalizeEmail(email);

    const byOAuth = await prisma.user.findFirst({
      where: { oauthProvider: provider, oauthId: sub },
    });
    if (byOAuth) return { user: byOAuth };

    let user = await findUserByEmail(normalizedEmail);

    if (user) {
      if (user.password && (!user.oauthProvider || !user.oauthId)) {
        return { requiresLink: true, email, provider, sub, picture };
      }
      if (user.oauthProvider && user.oauthId && user.oauthId !== sub) {
        throw new Error('OAuth account mismatch for this email');
      }
      if (!user.oauthProvider || !user.oauthId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: provider,
            oauthId: sub,
            avatarUrl: user.avatarUrl || picture,
            isVerified: true,
            status: 'ACTIVE',
          },
        });
      }
      return { user };
    }

    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        oauthProvider: provider,
        oauthId: sub,
        avatarUrl: picture,
        isVerified: true,
        status: 'ACTIVE',
        role: 'USER',
      },
    });

    return { user };
  }

  static async linkOAuthAccount(
    userId: string,
    provider: string,
    sub: string,
    picture?: string,
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        oauthProvider: provider,
        oauthId: sub,
        avatarUrl: picture,
        isVerified: true,
        status: 'ACTIVE',
      },
    });
  }

  static generateOAuthToken(payload: { id: string; email: string; name: string | null; role: string }) {
    return this.generateAccessToken({
      userId: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    });
  }
}
