import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-here-change-in-production';
const JWT_EXPIRES_IN = '15m'; // 15 minutes for access token
const JWT_REFRESH_EXPIRES_IN = '7d'; // 7 days for refresh token

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  role: 'USER' | 'SUPERUSER';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const startTime = Date.now();
    const saltRounds = 10; // Reduced from 12 to 10 for better performance (~100-200ms savings)
    const hashed = await bcrypt.hash(password, saltRounds);
    const duration = Date.now() - startTime;
    console.log(`⏱️ HASH PASSWORD: ${duration}ms (saltRounds: ${saltRounds})`);
    return hashed;
  }

  // Compare password
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    const startTime = Date.now();
    const result = await bcrypt.compare(password, hashedPassword);
    const duration = Date.now() - startTime;
    console.log(`⏱️ COMPARE PASSWORD: ${duration}ms`);
    return result;
  }

  // Generate access token
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Generate refresh token
  static generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  }

  // Verify access token
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
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
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const dbStart2 = Date.now();
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0], // Use email prefix as default name
        role: 'USER',
      }
    });
    console.log(`⏱️ DB QUERY (create): ${Date.now() - dbStart2}ms`);

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
    });

    console.log(`⏱️ REGISTER COMPLETE: ${Date.now() - startTime}ms`);
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

  // Login user
  static async loginUser(email: string, password: string) {
    const startTime = Date.now();
    console.log('🔐 LOGIN API - Starting login request');
    console.log('🔐 LOGIN API - Login attempt for email:', email);
    console.log(`⏱️ LOGIN START: ${email}`);

    // Find user
    const dbStart1 = Date.now();
    const user = await prisma.user.findUnique({
      where: { email }
    });
    console.log(`⏱️ DB QUERY (findUnique): ${Date.now() - dbStart1}ms`);

    if (!user) {
      console.log('❌ LOGIN API - User not found for email:', email);
      throw new Error('Email does not exist');
    }

    console.log('✅ LOGIN API - User found:', user.email, 'ID:', user.id);

    if (!user.isActive) {
      console.log('❌ LOGIN API - Account is deactivated');
      throw new Error('Account is deactivated');
    }

    // Check if password is hashed (starts with $2b$)
    const isPasswordHashed = user.password.startsWith('$2b$');
    console.log('🔍 LOGIN API - Password is hashed:', isPasswordHashed);
    console.log('🔍 LOGIN API - Stored password format:', user.password.substring(0, 20) + '...');

    let isValidPassword = false;

    if (isPasswordHashed) {
      // Password is hashed, use bcrypt comparison
      isValidPassword = await this.comparePassword(password, user.password);
      console.log('🔍 LOGIN API - Bcrypt comparison result:', isValidPassword);
    } else {
      // Password is not hashed, do plain text comparison (for existing data)
      isValidPassword = password === user.password;
      console.log('🔍 LOGIN API - Plain text comparison result:', isValidPassword);
      console.log('⚠️ LOGIN API - WARNING: Using plain text password comparison!');
    }

    if (!isValidPassword) {
      console.log('❌ LOGIN API - Password verification failed');
      throw new Error('Password is incorrect');
    }

    // Update last login
    const dbStart2 = Date.now();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    console.log(`⏱️ DB QUERY (update): ${Date.now() - dbStart2}ms`);

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
    });

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

        console.log(`⏱️ GET USER FROM TOKEN DB QUERY (fallback): ${Date.now() - dbStart}ms`);

        if (!user) {
          console.log('⚠️ GET USER FROM TOKEN - User not found (fallback)');
          return null;
        }

        console.log(`✅ GET USER FROM TOKEN SUCCESS (fallback) in ${Date.now() - startTime}ms`);
        return { ...user, status: 'ACTIVE' as const };
      }

      throw error;
    }
  }
}