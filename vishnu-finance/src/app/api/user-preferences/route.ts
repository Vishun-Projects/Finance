import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// GET user preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const preferences = await (prisma as any).userPreferences.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    if (!preferences) {
      // Return default preferences if none exist
      return NextResponse.json({
        navigationLayout: 'sidebar',
        theme: 'light',
        colorScheme: 'default'
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

// POST/PUT user preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, navigationLayout, theme, colorScheme, currency, language, timezone, dateFormat } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Upsert preferences (create if doesn't exist, update if it does)
    const preferences = await (prisma as any).userPreferences.upsert({
      where: { userId },
      update: {
        navigationLayout,
        theme,
        colorScheme,
        currency,
        language,
        timezone,
        dateFormat,
        updatedAt: new Date()
      },
      create: {
        userId,
        navigationLayout: navigationLayout || 'sidebar',
        theme: theme || 'light',
        colorScheme: colorScheme || 'default',
        currency: currency || 'INR',
        language: language || 'en',
        timezone: timezone || 'Asia/Kolkata',
        dateFormat: dateFormat || 'DD/MM/YYYY'
      }
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}

// DELETE user preferences
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await (prisma as any).userPreferences.delete({
      where: { userId }
    });

    return NextResponse.json({ message: 'Preferences deleted successfully' });
  } catch (error) {
    console.error('Error deleting user preferences:', error);
    return NextResponse.json({ error: 'Failed to delete preferences' }, { status: 500 });
  }
}
