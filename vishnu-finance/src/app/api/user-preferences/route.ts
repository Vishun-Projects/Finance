import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { globalCache } from '@/lib/cache-singleton';
import { rejectForeignUserId } from '@/lib/api-user-scope';

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const forbidden = rejectForeignUserId(user, searchParams.get('userId'));
    if (forbidden) return forbidden;

    const userId = user.id;
    const cacheKey = `user_prefs:${userId}`;
    const cachedPrefs = globalCache.get(cacheKey);
    if (cachedPrefs) {
      return NextResponse.json(cachedPrefs);
    }

    const preferences = await (prisma as any).userPreferences.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!preferences) {
      return NextResponse.json({
        navigationLayout: 'sidebar',
        theme: 'system',
        colorScheme: 'default',
      });
    }

    globalCache.set(cacheKey, preferences);
    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const forbidden = rejectForeignUserId(user, body.userId);
    if (forbidden) return forbidden;

    const userId = user.id;
    const telegramUserId =
      body.telegramUserId && String(body.telegramUserId).trim() !== ''
        ? String(body.telegramUserId).trim()
        : null;

    const preferences = await (prisma as any).userPreferences.upsert({
      where: { userId },
      update: {
        navigationLayout: body.navigationLayout,
        theme: body.theme,
        colorScheme: body.colorScheme,
        currency: body.currency,
        language: body.language,
        timezone: body.timezone,
        dateFormat: body.dateFormat,
        telegramUserId,
        telegramEnabled: body.telegramEnabled,
        emailEnabled: body.emailEnabled,
        dailyQuoteEnabled: body.dailyQuoteEnabled,
        notificationEmail: body.notificationEmail,
        updatedAt: new Date(),
      },
      create: {
        userId,
        navigationLayout: body.navigationLayout || 'sidebar',
        theme: body.theme || 'system',
        colorScheme: body.colorScheme || 'default',
        currency: body.currency || 'INR',
        language: body.language || 'en',
        timezone: body.timezone || 'Asia/Kolkata',
        dateFormat: body.dateFormat || 'DD/MM/YYYY',
        telegramUserId,
        telegramEnabled: body.telegramEnabled || false,
        emailEnabled: body.emailEnabled || false,
        dailyQuoteEnabled: body.dailyQuoteEnabled || false,
        notificationEmail: body.notificationEmail || null,
      },
    });

    globalCache.delete(`user_prefs:${userId}`);
    return NextResponse.json(preferences);
  } catch (error: unknown) {
    const err = error as { code?: string; meta?: { target?: string[] } };
    if (err.code === 'P2002' && err.meta?.target?.includes('telegramUserId')) {
      return NextResponse.json(
        { error: 'This Telegram ID is already linked to another account.' },
        { status: 409 },
      );
    }
    console.error('Error saving user preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const forbidden = rejectForeignUserId(user, searchParams.get('userId'));
    if (forbidden) return forbidden;

    await (prisma as any).userPreferences.delete({
      where: { userId: user.id },
    });

    globalCache.delete(`user_prefs:${user.id}`);
    return NextResponse.json({ message: 'Preferences deleted successfully' });
  } catch (error) {
    console.error('Error deleting user preferences:', error);
    return NextResponse.json({ error: 'Failed to delete preferences' }, { status: 500 });
  }
});
