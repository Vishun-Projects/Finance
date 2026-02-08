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
        theme: 'system',
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
    const {
      userId,
      navigationLayout,
      theme,
      colorScheme,
      currency,
      language,
      timezone,
      dateFormat,
      notificationEmail
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Normalize telegramUserId: empty string should be null
    const telegramUserId = (body.telegramUserId && String(body.telegramUserId).trim() !== '')
      ? String(body.telegramUserId).trim()
      : null;

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
        telegramUserId,
        telegramEnabled: body.telegramEnabled,
        emailEnabled: body.emailEnabled,
        dailyQuoteEnabled: body.dailyQuoteEnabled,
        notificationEmail: body.notificationEmail,
        updatedAt: new Date()
      },
      create: {
        userId,
        navigationLayout: navigationLayout || 'sidebar',
        theme: theme || 'system',
        colorScheme: colorScheme || 'default',
        currency: currency || 'INR',
        language: language || 'en',
        timezone: timezone || 'Asia/Kolkata',
        dateFormat: dateFormat || 'DD/MM/YYYY',
        telegramUserId,
        telegramEnabled: body.telegramEnabled || false,
        emailEnabled: body.emailEnabled || false,
        dailyQuoteEnabled: body.dailyQuoteEnabled || false,
        notificationEmail: body.notificationEmail || null
      }
    });

    return NextResponse.json(preferences);
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      if (target.includes('telegramUserId')) {
        return NextResponse.json({
          error: 'This Telegram ID is already linked to another account.'
        }, { status: 409 });
      }
    }

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
