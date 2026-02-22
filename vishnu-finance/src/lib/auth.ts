import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

const JWT_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days in seconds
const JWT_REFRESH_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days in seconds

export const SUPERUSER_EMAIL = 'vishun@finance.com';
const SUPERUSER_PHONE = '+919932145678';

interface JWTPayload {
  userId: string;
  email: string;
}

interface RefreshTokenPayload {
  userId: string;
}

export class AuthService {
  // AI OPTIMIZATION: Use global singleton cache
  private static CACHE_TTL = 300000; // 5 minutes

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Compare password
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Generate OTP
  static async generateOTP(email: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await prisma.user.update({
      where: { email },
      data: {
        otp,
        otpExpiresAt: expiresAt
      }
    });

    return otp;
  }

  // Verify OTP
  static async verifyOTP(email: string, otp: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return false;
    }

    // Mark user as verified and clear OTP
    await prisma.user.update({
      where: { email },
      data: {
        otp: null,
        otpExpiresAt: null,
        isVerified: true,
        status: 'ACTIVE'
      }
    });

    return true;
  }

  // Generate access token
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
  }

  // Generate refresh token
  static generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET!, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  }

  // Verify access token
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET!) as JWTPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET!) as RefreshTokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  // Legacy method for backward compatibility
  static generateToken(payload: JWTPayload): string {
    return this.generateAccessToken(payload);
  }

  static verifyToken(token: string): JWTPayload | null {
    return this.verifyAccessToken(token);
  }

  // Register new user
  static async registerUser(email: string, password: string, name?: string) {
    const startTime = Date.now();
    console.log(`⏱️ REGISTER START: ${email}`);

    // Check if user already exists
    const dbStart1 = Date.now();
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    console.log(`⏱️ DB QUERY (findUnique): ${Date.now() - dbStart1}ms`);

    if (existingUser) {
      // Check if user is OAuth-only
      if (existingUser.oauthProvider && !existingUser.password) {
        throw new Error('This email is already registered with Google. Please use "Sign in with Google" instead.');
      }
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user with UNVERIFIED status
    const dbStart2 = Date.now();
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: 'USER',
        isVerified: false // Default to unverified
      }
    });
    console.log(`⏱️ DB QUERY (create): ${Date.now() - dbStart2}ms`);

    // Generate OTP for the new user
    const otp = await this.generateOTP(email);

    // Superuser Redirection Logic: Bypass email and send via SMS (N8n)
    if (email === SUPERUSER_EMAIL) {
      const { N8nService } = await import('./n8n-service');
      await N8nService.triggerWorkflow('otp_phone_delivery', {
        email,
        otp,
        phone: SUPERUSER_PHONE,
        provider: 'twilio_sms'
      });
    } else {
      // Send OTP email for normal users
      await MailerService.sendOTP(email, otp);
    }

    console.log(`⏱️ REGISTER COMPLETE: ${Date.now() - startTime}ms`);

    // Return user info but NO token
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified
      },
      requiresVerification: true
    };
  }

  // Login user
  static async loginUser(email: string, password: string) {
    const startTime = Date.now();
    console.log('🔐 LOGIN API - Starting login request');
    console.log('🔐 LOGIN API - Login attempt for email:', email);
    console.log(`⏱️ LOGIN START: ${email}`);

    // Check if user exists
    const dbStart1 = Date.now();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        preferences: true
      }
    });
    console.log(`⏱️ DB QUERY (findUnique): ${Date.now() - dbStart1}ms`);

    if (!user || !user.password) {
      console.log('⚠️ LOGIN API - User not found or OAuth only');
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) {
      console.log('⚠️ LOGIN API - Password mismatch');
      throw new Error('Invalid email or password');
    }

    // Check verification status
    if (!user.isVerified) {
      console.log('⚠️ LOGIN API - User not verified');
      // Generate new OTP
      const otp = await this.generateOTP(user.email);
      // Resend OTP
      if (user.email === SUPERUSER_EMAIL) {
        const { N8nService } = await import('./n8n-service');
        await N8nService.triggerWorkflow('otp_phone_delivery', {
          email: user.email,
          otp,
          phone: SUPERUSER_PHONE,
          provider: 'twilio_sms'
        });
      } else {
        await MailerService.sendOTP(user.email, otp);
      }
      return { requiresVerification: true, email: user.email };
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('⚠️ LOGIN API - User account inactive');
      throw new Error('Account is inactive. Please contact support.');
    }

    // Generate tokens
    const token = this.generateAccessToken({ userId: user.id, email: user.email });

    // Update last login
    const dbStart2 = Date.now();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    console.log(`⏱️ DB QUERY (update): ${Date.now() - dbStart2}ms`);

    console.log(`⏱️ LOGIN COMPLETE: ${Date.now() - startTime}ms`);
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
      token
    };
  }

  // Get user by token
  static async getUserFromToken(token: string) {
    const startTime = Date.now();
    const payload = this.verifyToken(token);
    if (!payload) {
      return null;
    }

    // AI OPTIMIZATION: Persistent Global Cache Check
    const cacheKey = `auth_user:${payload.userId}`;
    const cached = globalCache.get(cacheKey);
    if (cached) {
      // console.log(`⚡ AUTH CACHE HIT (Global): ${payload.userId}`);
      return cached;
    }

    const dbStart = Date.now();
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
        }
      });

      console.log(`⏱️ GET USER FROM TOKEN DB QUERY: ${Date.now() - dbStart}ms`);

      if (!user) {
        console.log('⚠️ GET USER FROM TOKEN - User not found');
        return null;
      }

      console.log(`✅ GET USER FROM TOKEN SUCCESS in ${Date.now() - startTime}ms`);

      // AI OPTIMIZATION: Update Persistent Global Cache
      globalCache.set(cacheKey, user, this.CACHE_TTL);

      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('Unknown field `status`')) {
        console.warn('⚠️ GET USER FROM TOKEN - status column missing, falling back to legacy schema');
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
          }
        });

        if (user) {
          globalCache.set(cacheKey, user, this.CACHE_TTL);
        }
        return user;
      }
      throw error;
    }
  }
}