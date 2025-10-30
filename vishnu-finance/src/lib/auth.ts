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
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
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
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0], // Use email prefix as default name
      }
    });

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name || undefined
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    };
  }

  // Login user
  static async loginUser(email: string, password: string) {
    console.log('🔐 LOGIN API - Starting login request');
    console.log('🔐 LOGIN API - Login attempt for email:', email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

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
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name || undefined
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    };
  }

  // Get user by token
  static async getUserFromToken(token: string) {
    const payload = this.verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    return user;
  }
}
