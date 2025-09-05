import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        email: email
      }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({
        error: 'Account is deactivated'
      }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json({
        error: 'Invalid password',
        email: email
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Login test successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
