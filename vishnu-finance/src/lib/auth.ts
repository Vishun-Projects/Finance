import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
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

  // Generate JWT token
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Verify JWT token
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
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
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
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
