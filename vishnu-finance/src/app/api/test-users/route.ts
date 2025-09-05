import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get all users (without passwords for security)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Users retrieved successfully',
      users: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
