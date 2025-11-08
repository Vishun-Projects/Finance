import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateIndianPhoneNumber } from '@/lib/pincode-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/profile
 * Fetch user profile data
 */
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    // Fetch full user profile from database
    const userProfile = await (prisma as any).user.findUnique({
      where: { id: user.id },
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
        createdAt: true,
        updatedAt: true,
        isActive: true,
      }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: userProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Update user profile data
 */
export async function PUT(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      gender,
      phone,
      dateOfBirth,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      pincode,
      occupation,
      bio
    } = body;

    // Validate phone number if provided
    if (phone && !validateIndianPhoneNumber(phone)) {
      return NextResponse.json({ 
        error: 'Invalid phone number format. Please enter a valid Indian phone number.' 
      }, { status: 400 });
    }

    // Validate gender if provided
    const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
    if (gender && !validGenders.includes(gender)) {
      return NextResponse.json({ 
        error: 'Invalid gender value' 
      }, { status: 400 });
    }

    // Build update data object (only include fields that are provided)
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1 || null;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2 || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (country !== undefined) updateData.country = country || null;
    if (pincode !== undefined) updateData.pincode = pincode || null;
    if (occupation !== undefined) updateData.occupation = occupation || null;
    if (bio !== undefined) updateData.bio = bio || null;

    // Update user profile
    const updatedUser = await (prisma as any).user.update({
      where: { id: user.id },
      data: updateData,
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
        createdAt: true,
        updatedAt: true,
        isActive: true,
      }
    });

    return NextResponse.json({ 
      user: updatedUser,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

