import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { clearUserCache } from '@/lib/api-cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { corsPreflightHeaders } from '@/lib/cors';

// Helper functions for analytics
function processMonthlyTrends(income: any[], expenses: any[], months: number) {
  const trends: any[] = [];
  const currentDate = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    const monthIncome = income
      .filter(item => {
        const itemDate = new Date(item.startDate || item.date);
        return `${itemDate.getFullYear()}-${itemDate.getMonth()}` === monthKey;
      })
      .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    const monthExpenses = expenses
      .filter(item => {
        const itemDate = new Date(item.date);
        return `${itemDate.getFullYear()}-${itemDate.getMonth()}` === monthKey;
      })
      .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    trends.push({
      month: monthNames[date.getMonth()],
      income: monthIncome,
      expenses: monthExpenses,
      savings: monthIncome - monthExpenses,
    });
  }

  return trends;
}

function processCategoryBreakdown(expenses: any[]) {
  const categoryMap = new Map<string, number>();

  expenses.forEach(expense => {
    const category = expense.category || expense.categoryName || 'Uncategorized';
    const amount = parseFloat(expense.amount || 0);
    categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
  });

  return Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsPreflightHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    const { guardMutationRequest } = await import('@/lib/request-guard');
    const guardResponse = guardMutationRequest(request, { action });
    if (guardResponse) return guardResponse;

    // --- CENTRAL AUTHENTICATION ---
    const publicActions = ['auth_login', 'auth_register'];
    const isPublicAction = publicActions.includes(action);

    let user: any = null;
    if (!isPublicAction) {
      const { AuthService } = await import('@/lib/auth');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // --- CENTRAL AUTHORIZATION (IDOR protection) ---
      // If a userId is passed in the body, it must match the authenticated user
      // unless the authenticated user is a SUPERUSER.
      if (body.userId && body.userId !== user.id && user.role !== 'SUPERUSER') {
        return NextResponse.json({ error: 'Forbidden: You can only access your own data' }, { status: 403 });
      }
    }
    // ------------------------------

    switch (action) {
      case 'razorpay_create_order': {
        const amount = Number(body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }
        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const currency = process.env.NEXT_PUBLIC_RAZORPAY_CURRENCY || 'INR';
        if (!keyId || !keySecret) {
          return NextResponse.json(
            { error: 'Razorpay environment variables not configured' },
            { status: 500 }
          );
        }
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
          },
          body: JSON.stringify({
            amount,
            currency,
            payment_capture: 1,
            notes: { purpose: 'settings_test_payment' },
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          return NextResponse.json(
            { error: 'Failed to create Razorpay order', details: err },
            { status: 500 }
          );
        }
        const data = await res.json();
        return NextResponse.json({
          orderId: data.id,
          amount: data.amount,
          currency: data.currency,
        });
      }

      case 'razorpay_verify': {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
          body || {};
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
          return NextResponse.json(
            { error: 'Razorpay secret not configured' },
            { status: 500 }
          );
        }
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return NextResponse.json(
            { error: 'Missing verification parameters' },
            { status: 400 }
          );
        }
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');
        const verified = expectedSignature === razorpay_signature;
        return NextResponse.json({ verified });
      }
    }

    // Categories
    if (action === 'categories_list') {
      const { search } = new URL(request.url);
      const typeParam = new URLSearchParams(search).get('type') as
        | 'INCOME'
        | 'EXPENSE'
        | null;
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const where: any = { OR: [{ userId: user.id }, { isDefault: true }] };
      if (typeParam) where.type = typeParam;
      const categories = await prisma.category.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });
      const transformed = categories.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color || '#3B82F6',
        icon: c.icon || null,
        isDefault: c.isDefault,
        userId: c.userId,
      }));
      return NextResponse.json(transformed);
    }

    if (action === 'categories_create') {
      const { name, type, color, icon } = body || {};
      if (!name || !type) return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
      if (!['INCOME', 'EXPENSE'].includes(type)) return NextResponse.json({ error: 'Type must be INCOME or EXPENSE' }, { status: 400 });
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const existing = await prisma.category.findFirst({ where: { name, type, userId: user.id } });
      if (existing) return NextResponse.json({ error: 'Category with this name and type already exists' }, { status: 400 });
      const category = await prisma.category.create({
        data: {
          name,
          type,
          color: color || '#3B82F6',
          icon: icon || null,
          isDefault: false,
          userId: user.id,
        },
      });
      return NextResponse.json({
        id: category.id,
        name: category.name,
        type: category.type,
        color: category.color || '#3B82F6',
        icon: category.icon,
        isDefault: category.isDefault,
        userId: category.userId,
      });
    }

    if (action === 'categories_update') {
      const { id, name, color, icon } = body || {};
      if (!id) return NextResponse.json({ error: 'Category id is required' }, { status: 400 });
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      if (category.isDefault) return NextResponse.json({ error: 'Cannot modify default categories' }, { status: 403 });
      if (category.userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const updated = await prisma.category.update({
        where: { id },
        data: { ...(name && { name }), ...(color && { color }), ...(icon !== undefined && { icon }) },
      });
      return NextResponse.json({
        id: updated.id,
        name: updated.name,
        type: updated.type,
        color: updated.color || '#3B82F6',
        icon: updated.icon,
        isDefault: updated.isDefault,
        userId: updated.userId,
      });
    }

    if (action === 'categories_delete') {
      const { id } = body || {};
      if (!id) return NextResponse.json({ error: 'Category id is required' }, { status: 400 });
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      if (category.isDefault) return NextResponse.json({ error: 'Cannot delete default categories' }, { status: 403 });
      if (category.userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const transactionCount = await prisma.transaction.count({ where: { categoryId: id } });
      if (transactionCount > 0) {
        return NextResponse.json(
          { error: `Cannot delete category. It is being used by ${transactionCount} transaction(s). Please reassign those transactions first.` },
          { status: 400 }
        );
      }
      await prisma.category.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // User Preferences
    if (action === 'user_preferences_get') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const preferences = await (prisma as any).userPreferences.findUnique({
        where: { userId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      if (!preferences) {
        return NextResponse.json({
          navigationLayout: 'sidebar',
          theme: 'light',
          colorScheme: 'default',
        });
      }
      return NextResponse.json(preferences);
    }

    if (action === 'user_preferences_save') {
      const { userId, navigationLayout, theme, colorScheme, currency, language, timezone, dateFormat } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
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
          updatedAt: new Date(),
        },
        create: {
          userId,
          navigationLayout: navigationLayout || 'sidebar',
          theme: theme || 'light',
          colorScheme: colorScheme || 'default',
          currency: currency || 'INR',
          language: language || 'en',
          timezone: timezone || 'Asia/Kolkata',
          dateFormat: dateFormat || 'DD/MM/YYYY',
        },
      });
      return NextResponse.json(preferences);
    }

    if (action === 'user_preferences_delete') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      await (prisma as any).userPreferences.delete({ where: { userId } });
      return NextResponse.json({ message: 'Preferences deleted successfully' });
    }

    // Transactions — delegated to TransactionService (backward-compatible API)
    const transactionActions = new Set([
      'transactions_list',
      'transactions_daily_spend',
      'transactions_category_breakdown',
      'transactions_create',
      'transactions_update',
      'transactions_delete_single',
      'transactions_delete_bulk',
      'transactions_restore',
      'transactions_batch_update',
      'transactions_auto_categorize',
      'transactions_categorize',
      'transactions_categorize_background_status',
    ]);

    if (transactionActions.has(action)) {
      const {
        TransactionServiceError,
        listTransactions,
        getDailySpend,
        getCategoryBreakdown,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        deleteTransactionsBulk,
        restoreTransactions,
        batchUpdateTransactions,
        autoCategorizeTransactions,
        categorizeTransactionsForUser,
        getCategorizeBackgroundStatus,
      } = await import('@/lib/services/transaction-service');

      try {
        let result: unknown;
        switch (action) {
          case 'transactions_list':
            result = await listTransactions(user!.id, body || {});
            break;
          case 'transactions_daily_spend':
            result = await getDailySpend(user!.id, body || {});
            break;
          case 'transactions_category_breakdown':
            result = await getCategoryBreakdown(user!.id, body || {});
            break;
          case 'transactions_create':
            result = await createTransaction(user!.id, body || {});
            return NextResponse.json(result, { status: 201 });
          case 'transactions_update':
            result = await updateTransaction(user!.id, body || {});
            break;
          case 'transactions_delete_single':
            result = await deleteTransaction(user!.id, { id: body?.id });
            break;
          case 'transactions_delete_bulk':
            result = await deleteTransactionsBulk(user!.id, {
              transactionIds: body?.transactionIds,
              filters: body?.filters,
            });
            break;
          case 'transactions_restore':
            result = await restoreTransactions(user!.id, {
              transactionIds: body?.transactionIds,
              filters: body?.filters,
            });
            break;
          case 'transactions_batch_update':
            result = await batchUpdateTransactions(user!.id, { updates: body?.updates });
            break;
          case 'transactions_auto_categorize':
            result = await autoCategorizeTransactions(user!.id);
            break;
          case 'transactions_categorize':
            result = await categorizeTransactionsForUser(user!.id, body?.transactions);
            break;
          case 'transactions_categorize_background_status':
            result = await getCategorizeBackgroundStatus(user!.id, body?.transactionIds);
            break;
          default:
            return NextResponse.json({ error: 'Unknown transaction action' }, { status: 400 });
        }
        return NextResponse.json(result);
      } catch (err) {
        if (err instanceof TransactionServiceError) {
        return NextResponse.json(
            { error: err.message, ...(err.extras ?? {}) },
            { status: err.status },
          );
        }
    if (action === 'transactions_auto_categorize') {
          console.error('Auto categorize error:', err);
          const message = err instanceof Error ? err.message : 'Auto categorization failed';
          return NextResponse.json({ error: message }, { status: 500 });
        }
        throw err;
      }
    }

    // Auth - Login
    if (action === 'auth_login') {
      const rateLimitResponse = await (await import('@/lib/rate-limit')).rateLimitMiddleware('auth', request);
      if (rateLimitResponse) return rateLimitResponse;
      const { email, password } = body || {};
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }
      const { AuthService, normalizeEmail } = await import('@/lib/auth');
      const normalizedEmail = normalizeEmail(email);
      const { writeAuditLog, extractRequestMeta } = await import('@/lib/audit');
      const { setSessionCookies } = await import('@/lib/session-cookies');
      const meta = extractRequestMeta(request);
      try {
      const result = await AuthService.loginUser(normalizedEmail, password);

      if ('requiresVerification' in result && result.requiresVerification) {
        return NextResponse.json({
          success: false,
          requiresVerification: true,
          email: result.email,
          message: 'Verification required. Check your email or phone for a code.',
        }, { status: 403 });
      }

      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        user: (result as { user: unknown }).user,
      });

      if ('user' in result && result.user && 'token' in result && result.token) {
          await setSessionCookies(response, {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          });

        await writeAuditLog({
          actorId: result.user.id,
          event: 'USER_LOGIN',
          severity: 'INFO',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          message: `${result.user.email} signed in`,
        });
      }
      return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid email or password';
        await writeAuditLog({
          actorId: 'anonymous',
          event: 'AUTH_LOGIN_FAILED',
          severity: 'WARN',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          message: `Failed login attempt for ${normalizedEmail}`,
          metadata: { email: normalizedEmail },
        });
        return NextResponse.json({ error: message }, { status: 401 });
      }
    }

    // Auth - Register
    if (action === 'auth_register') {
      const rateLimitResponse = await (await import('@/lib/rate-limit')).rateLimitMiddleware('auth', request);
      if (rateLimitResponse) return rateLimitResponse;
      const { email, password, name } = body || {};
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
      }
      const { AuthService } = await import('@/lib/auth');
      try {
        const result = await AuthService.registerUser(email, password, name);

        const responseData: any = {
          message: 'User registered successfully',
          user: result.user,
          requiresVerification: !!result.requiresVerification
        };

        const response = NextResponse.json(responseData, { status: 201 });

        // Only set cookie if there's a token (unlikely in new verification flow)
        if ((result as any).token) {
          const { setSessionCookies } = await import('@/lib/session-cookies');
          await setSessionCookies(response, {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
          });
        }

        return response;
      } catch (error: any) {
        if (error.message === 'User already exists with this email') {
          return NextResponse.json({ error: 'User already exists with this email' }, { status: 409 });
        }
        console.error('Registration error in main app route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }

    // Auth - Me
    if (action === 'auth_me') {
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
      const { AuthService } = await import('@/lib/auth');
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      if (!user.isActive) return NextResponse.json({ error: 'Account is deactivated' }, { status: 401 });
      return NextResponse.json({ user });
    }

    // Auth - Logout
    if (action === 'auth_logout') {
      const { AuthService } = await import('@/lib/auth');
      const { revokeAllUserRefreshTokens, revokeRefreshToken } = await import('@/lib/refresh-token-service');
      const { REFRESH_COOKIE, clearSessionCookies } = await import('@/lib/session-cookies');
      const authToken = request.cookies.get('auth-token');
      const refreshToken = request.cookies.get(REFRESH_COOKIE);
      if (authToken) {
        const sessionUser = await AuthService.getUserFromToken(authToken.value);
        if (sessionUser?.id) {
          AuthService.invalidateUserCache(sessionUser.id);
          await revokeAllUserRefreshTokens(sessionUser.id);
        }
      }
      if (refreshToken?.value) {
        await revokeRefreshToken(refreshToken.value);
      }
      const response = NextResponse.json({ message: 'Logged out successfully' });
      clearSessionCookies(response);
      return response;
    }

    // User Profile - Get
    if (action === 'user_profile_get') {
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        },
      });
      if (!userProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      return NextResponse.json({ user: userProfile });
    }

    // User Profile - Update
    if (action === 'user_profile_update') {
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const { validateIndianPhoneNumber } = await import('@/lib/pincode-api');
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        bio,
      } = body || {};

      if (phone && !validateIndianPhoneNumber(phone)) {
        return NextResponse.json({ error: 'Invalid phone number format. Please enter a valid Indian phone number.' }, { status: 400 });
      }

      const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
      if (gender && !validGenders.includes(gender)) {
        return NextResponse.json({ error: 'Invalid gender value' }, { status: 400 });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name || null;
      if (gender !== undefined) updateData.gender = gender || null;
      if (phone !== undefined) updateData.phone = phone || null;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1 || null;
      if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2 || null;
      if (city !== undefined) updateData.city = city || null;
      if (state !== undefined) updateData.state = state || null;
      if (country !== undefined) updateData.country = country || null;
      if (pincode !== undefined) updateData.pincode = pincode || null;
      if (occupation !== undefined) updateData.occupation = occupation || null;
      if (bio !== undefined) updateData.bio = bio || null;

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
        },
      });

      return NextResponse.json({ user: updatedUser, message: 'Profile updated successfully' });
    }

    // Income - Get
    if (action === 'income_list') {
      const { userId, start, end, page = 1, pageSize: pageSizeParam = '100', includeTotal = false } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const { getCanonicalNamesBatch } = await import('@/lib/entity-mapping-service');
      const pageSize = Math.min(parseInt(String(pageSizeParam || '100')), 200);
      const skip = (Number(page) - 1) * pageSize;
      const dateFilter = start && end ? {
        gte: new Date(start),
        lte: new Date(new Date(end).setHours(23, 59, 59, 999)),
      } : undefined;

      const [transactionCount, incomeSourceCount, transactions, incomeSources] = await Promise.all([
        includeTotal ? (prisma as any).transaction.count({
          where: {
            userId,
            isDeleted: false,
            financialCategory: 'INCOME',
            creditAmount: { gt: 0 },
            ...(dateFilter ? { transactionDate: dateFilter } : {}),
          },
        }) : Promise.resolve(0),
        includeTotal ? (prisma as any).incomeSource.count({
          where: {
            userId,
            isActive: true,
            isDeleted: false,
            ...(dateFilter ? { startDate: dateFilter } : {}),
          },
        }) : Promise.resolve(0),
        (prisma as any).transaction.findMany({
          where: {
            userId,
            isDeleted: false,
            financialCategory: 'INCOME',
            creditAmount: { gt: 0 },
            ...(dateFilter ? { transactionDate: dateFilter } : {}),
          },
          include: { category: true },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: pageSize,
        }),
        (prisma as any).incomeSource.findMany({
          where: {
            userId,
            isActive: true,
            isDeleted: false,
            ...(dateFilter ? { startDate: dateFilter } : {}),
          },
          orderBy: { startDate: 'desc' },
          skip,
          take: pageSize,
        }),
      ]);

      const allIncomes = [
        ...transactions.map((t: any) => ({
          id: t.id,
          amount: Number(t.creditAmount),
          date: t.transactionDate,
          description: t.description,
          category: t.category,
          source: 'transaction',
        })),
        ...incomeSources.map((i: any) => ({
          id: i.id,
          amount: Number(i.amount),
          date: i.startDate,
          description: i.source,
          category: null,
          source: 'incomeSource',
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const stores = [...new Set(allIncomes.map((i: any) => i.description).filter(Boolean))];
      const canonicalNames = await getCanonicalNamesBatch(userId, stores, ['STORE' as const]);

      const processed = allIncomes.map((income: any) => ({
        ...income,
        canonicalName: canonicalNames[income.description] || income.description,
      }));

      return NextResponse.json({
        data: processed,
        pagination: {
          page: Number(page),
          pageSize,
          total: transactionCount + incomeSourceCount,
          totalPages: Math.ceil((transactionCount + incomeSourceCount) / pageSize),
        },
      });
    }

    // Expenses - Get
    if (action === 'expenses_list') {
      const { userId, start, end, page = 1, pageSize: pageSizeParam = '100', includeTotal = false } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const { getCanonicalNamesBatch } = await import('@/lib/entity-mapping-service');
      const pageSize = Math.min(parseInt(String(pageSizeParam || '100')), 200);
      const skip = (Number(page) - 1) * pageSize;
      const dateFilter = start && end ? {
        gte: new Date(start),
        lte: new Date(new Date(end).setHours(23, 59, 59, 999)),
      } : undefined;

      const [transactionCount, expenseCount, transactions, expenses] = await Promise.all([
        includeTotal ? (prisma as any).transaction.count({
          where: {
            userId,
            isDeleted: false,
            financialCategory: 'EXPENSE',
            debitAmount: { gt: 0 },
            ...(dateFilter ? { transactionDate: dateFilter } : {}),
          },
        }) : Promise.resolve(0),
        includeTotal ? (prisma as any).expense.count({
          where: {
            userId,
            isDeleted: false,
            ...(dateFilter ? { date: dateFilter } : {}),
          },
        }) : Promise.resolve(0),
        (prisma as any).transaction.findMany({
          where: {
            userId,
            isDeleted: false,
            financialCategory: 'EXPENSE',
            debitAmount: { gt: 0 },
            ...(dateFilter ? { transactionDate: dateFilter } : {}),
          },
          include: { category: true },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: pageSize,
        }),
        (prisma as any).expense.findMany({
          where: {
            userId,
            isDeleted: false,
            ...(dateFilter ? { date: dateFilter } : {}),
          },
          orderBy: { date: 'desc' },
          skip,
          take: pageSize,
        }),
      ]);

      const allExpenses = [
        ...transactions.map((t: any) => ({
          id: t.id,
          amount: Number(t.debitAmount),
          date: t.transactionDate,
          description: t.description,
          category: t.category,
          store: t.store,
          source: 'transaction',
        })),
        ...expenses.map((e: any) => ({
          id: e.id,
          amount: Number(e.amount),
          date: e.date,
          description: e.description,
          category: e.category,
          store: e.store,
          source: 'expense',
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const stores = [...new Set(allExpenses.map((e: any) => e.store).filter(Boolean))];
      const canonicalNames = await getCanonicalNamesBatch(userId, stores, ['STORE' as const]);

      const processed = allExpenses.map((expense: any) => ({
        ...expense,
        canonicalStore: canonicalNames[expense.store] || expense.store,
      }));

      return NextResponse.json({
        data: processed,
        pagination: {
          page: Number(page),
          pageSize,
          total: transactionCount + expenseCount,
          totalPages: Math.ceil((transactionCount + expenseCount) / pageSize),
        },
      });
    }

    // Wishlist - Get
    if (action === 'wishlist_list') {
      const { userId, page = 1, pageSize: pageSizeParam = '100', includeTotal = false } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const pageSize = Math.min(parseInt(String(pageSizeParam || '100')), 200);
      const skip = (Number(page) - 1) * pageSize;

      const [totalCount, wishlistItems] = await Promise.all([
        includeTotal ? (prisma as any).wishlistItem.count({ where: { userId } }) : Promise.resolve(0),
        (prisma as any).wishlistItem.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            description: true,
            estimatedCost: true,
            priority: true,
            category: true,
            targetDate: true,
            isCompleted: true,
            completedDate: true,
            imageUrl: true,
            notes: true,
            tags: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
      ]);

      const processed = wishlistItems.map((item: any) => ({
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
      }));

      return NextResponse.json({
        data: processed,
        pagination: {
          page: Number(page),
          pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNextPage: skip + pageSize < totalCount,
          hasPrevPage: page > 1,
        },
      });
    }

    // Wishlist - Create
    if (action === 'wishlist_create') {
      const { userId, title, description, estimatedCost, priority, category, targetDate, imageUrl, notes, tags } = body || {};
      if (!userId || !title) return NextResponse.json({ error: 'User ID and title are required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const item = await (prisma as any).wishlistItem.create({
        data: {
          userId,
          title,
          description: description || null,
          estimatedCost: estimatedCost ? parseFloat(String(estimatedCost)) : null,
          priority: priority || 'MEDIUM',
          category: category || null,
          targetDate: targetDate ? new Date(targetDate) : null,
          imageUrl: imageUrl || null,
          notes: notes || null,
          tags: tags ? JSON.stringify(tags) : null,
          isCompleted: false,
        },
      });
      return NextResponse.json({
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
      }, { status: 201 });
    }

    // Wishlist - Update
    if (action === 'wishlist_update') {
      const { id, ...updateData } = body || {};
      if (!id) return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const data: any = {};
      if (updateData.title !== undefined) data.title = updateData.title;
      if (updateData.description !== undefined) data.description = updateData.description;
      if (updateData.estimatedCost !== undefined) data.estimatedCost = updateData.estimatedCost ? parseFloat(String(updateData.estimatedCost)) : null;
      if (updateData.priority !== undefined) data.priority = updateData.priority;
      if (updateData.category !== undefined) data.category = updateData.category;
      if (updateData.targetDate !== undefined) data.targetDate = updateData.targetDate ? new Date(updateData.targetDate) : null;
      if (updateData.imageUrl !== undefined) data.imageUrl = updateData.imageUrl;
      if (updateData.notes !== undefined) data.notes = updateData.notes;
      if (updateData.tags !== undefined) data.tags = updateData.tags ? JSON.stringify(updateData.tags) : null;
      if (updateData.isCompleted !== undefined) {
        data.isCompleted = updateData.isCompleted;
        if (updateData.isCompleted) {
          data.completedDate = new Date();
        } else {
          data.completedDate = null;
        }
      }
      const updated = await (prisma as any).wishlistItem.update({
        where: { id, userId: user.id },
        data,
      });
      return NextResponse.json({
        ...updated,
        tags: updated.tags ? JSON.parse(updated.tags) : [],
      });
    }

    // Wishlist - Delete
    if (action === 'wishlist_delete') {
      const { id } = body || {};
      if (!id) return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      await (prisma as any).wishlistItem.delete({ where: { id, userId: user.id } });
      return NextResponse.json({ success: true });
    }

    // Goals - Get
    if (action === 'goals_list') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(goals);
    }

    // Goals - Create
    if (action === 'goals_create') {
      const { title, targetAmount, currentAmount, targetDate, priority, category, description, userId } = body || {};
      if (!title || !targetAmount || !userId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const { prisma } = await import('@/lib/db');
      const newGoal = await prisma.goal.create({
        data: {
          title,
          targetAmount: parseFloat(targetAmount),
          currentAmount: parseFloat(currentAmount || '0'),
          targetDate: targetDate ? new Date(targetDate) : null,
          priority: priority || 'MEDIUM',
          category: category || null,
          description: description || null,
          userId,
        },
      });
      return NextResponse.json(newGoal, { status: 201 });
    }

    // Goals - Update
    if (action === 'goals_update') {
      const { id, ...updateData } = body || {};
      if (!id) return NextResponse.json({ error: 'Goal id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const data: any = {};
      if (updateData.title !== undefined) data.title = updateData.title;
      if (updateData.targetAmount !== undefined) data.targetAmount = parseFloat(String(updateData.targetAmount));
      if (updateData.currentAmount !== undefined) data.currentAmount = parseFloat(String(updateData.currentAmount));
      if (updateData.targetDate !== undefined) data.targetDate = updateData.targetDate ? new Date(updateData.targetDate) : null;
      if (updateData.priority !== undefined) data.priority = updateData.priority;
      if (updateData.category !== undefined) data.category = updateData.category;
      if (updateData.description !== undefined) data.description = updateData.description;
      const updated = await prisma.goal.update({
        where: { id, userId: user.id },
        data,
      });
      return NextResponse.json(updated);
    }

    // Goals - Delete
    if (action === 'goals_delete') {
      const { id } = body || {};
      if (!id) return NextResponse.json({ error: 'Goal id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      await prisma.goal.delete({ where: { id, userId: user.id } });
      return NextResponse.json({ success: true });
    }

    // Deadlines - Get
    if (action === 'deadlines_list') {
      const { userId, page = 1, pageSize: pageSizeParam = '100', includeTotal = false } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const pageSize = Math.min(parseInt(String(pageSizeParam || '100')), 200);
      const skip = (Number(page) - 1) * pageSize;

      const [totalCount, deadlines] = await Promise.all([
        includeTotal ? (prisma as any).deadline.count({ where: { userId } }) : Promise.resolve(0),
        (prisma as any).deadline.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            description: true,
            amount: true,
            dueDate: true,
            isRecurring: true,
            frequency: true,
            status: true,
            category: true,
            isCompleted: true,
            completedDate: true,
            paymentMethod: true,
            accountDetails: true,
            notes: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { dueDate: 'asc' },
          skip,
          take: pageSize,
        }),
      ]);

      return NextResponse.json({
        data: deadlines,
        pagination: {
          page: Number(page),
          pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNextPage: skip + pageSize < totalCount,
          hasPrevPage: page > 1,
        },
      });
    }

    // Deadlines - Create
    if (action === 'deadlines_create') {
      const {
        userId,
        title,
        description,
        amount,
        dueDate,
        isRecurring,
        frequency,
        status,
        category,
        paymentMethod,
        accountDetails,
        notes,
      } = body || {};
      if (!userId || !title || !dueDate) {
        return NextResponse.json({ error: 'User ID, title, and due date are required' }, { status: 400 });
      }
      const { prisma } = await import('@/lib/db');
      const deadline = await (prisma as any).deadline.create({
        data: {
          userId,
          title,
          description: description || null,
          amount: amount ? parseFloat(String(amount)) : null,
          dueDate: new Date(dueDate),
          isRecurring: isRecurring || false,
          frequency: frequency || null,
          status: status || 'PENDING',
          category: category || null,
          paymentMethod: paymentMethod || null,
          accountDetails: accountDetails || null,
          notes: notes || null,
          isCompleted: false,
        },
      });
      return NextResponse.json(deadline, { status: 201 });
    }

    // Deadlines - Update
    if (action === 'deadlines_update') {
      const { id, ...updateData } = body || {};
      if (!id) return NextResponse.json({ error: 'Deadline id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const data: any = {};
      if (updateData.title !== undefined) data.title = updateData.title;
      if (updateData.description !== undefined) data.description = updateData.description;
      if (updateData.amount !== undefined) data.amount = updateData.amount ? parseFloat(String(updateData.amount)) : null;
      if (updateData.dueDate !== undefined) data.dueDate = new Date(updateData.dueDate);
      if (updateData.isRecurring !== undefined) data.isRecurring = updateData.isRecurring;
      if (updateData.frequency !== undefined) data.frequency = updateData.frequency;
      if (updateData.status !== undefined) data.status = updateData.status;
      if (updateData.category !== undefined) data.category = updateData.category;
      if (updateData.paymentMethod !== undefined) data.paymentMethod = updateData.paymentMethod;
      if (updateData.accountDetails !== undefined) data.accountDetails = updateData.accountDetails;
      if (updateData.notes !== undefined) data.notes = updateData.notes;
      if (updateData.isCompleted !== undefined) {
        data.isCompleted = updateData.isCompleted;
        if (updateData.isCompleted) {
          data.completedDate = new Date();
        } else {
          data.completedDate = null;
        }
      }
      const updated = await (prisma as any).deadline.update({
        where: { id, userId: user.id },
        data,
      });
      return NextResponse.json(updated);
    }

    // Deadlines - Delete
    if (action === 'deadlines_delete') {
      const { id } = body || {};
      if (!id) return NextResponse.json({ error: 'Deadline id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      await (prisma as any).deadline.delete({ where: { id, userId: user.id } });
      return NextResponse.json({ success: true });
    }

    // Analytics
    if (action === 'analytics_get') {
      const { userId, period = '6' } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

      const { dashboardService } = await import('@/lib/dashboard-service');
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - parseInt(String(period)));
      startDate.setDate(1);

      const data = await dashboardService.getSimpleStats({ userId, startDate, endDate });
      const totalDetails = data.categoryBreakdown.reduce((acc, item) => acc + item.amount, 0);

      return NextResponse.json({
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        netSavings: data.netSavings,
        savingsRate: data.savingsRate,
        monthlyTrends: data.monthlyTrends.map((t: any) => ({
          month: t.month,
          income: t.income,
          expenses: t.expenses,
          savings: t.savings
        })),
        categoryBreakdown: data.categoryBreakdown.map((c: any) => ({
          category: c.name,
          amount: c.amount,
          percentage: totalDetails > 0 ? (c.amount / totalDetails) * 100 : 0
        })),
        activeGoals: data.activeGoals,
        upcomingDeadlines: data.upcomingDeadlines,
        recentTransactions: data.recentTransactions.map((t: any) => ({
          id: t.id,
          type: t.type === 'credit' ? 'income' : t.type === 'debit' ? 'expense' : t.type,
          amount: Math.abs(t.amount),
          description: t.title,
          date: t.date
        }))
      });
    }

    // Salary Structure - Get
    if (action === 'salary_structure_list') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const structures = await (prisma as any).salaryStructure.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(structures);
    }

    // Salary Structure - Create
    if (action === 'salary_structure_create') {
      const {
        jobTitle,
        company,
        baseSalary,
        allowances,
        deductions,
        effectiveDate,
        endDate,
        currency,
        location,
        department,
        grade,
        notes,
        userId,
        changeType,
        changeReason,
      } = body || {};
      if (!jobTitle || !company || !baseSalary || !effectiveDate || !userId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const { prisma } = await import('@/lib/db');
      const structure = await (prisma as any).salaryStructure.create({
        data: {
          jobTitle,
          company,
          baseSalary: parseFloat(baseSalary),
          allowances: allowances ? JSON.stringify(allowances) : null,
          deductions: deductions ? JSON.stringify(deductions) : null,
          effectiveDate: new Date(effectiveDate),
          endDate: endDate ? new Date(endDate) : null,
          currency: currency || 'INR',
          location: location || null,
          department: department || null,
          grade: grade || null,
          notes: notes || null,
          userId,
          changeType: changeType || null,
          changeReason: changeReason || null,
        },
      });
      return NextResponse.json({
        ...structure,
        allowances: structure.allowances ? JSON.parse(structure.allowances) : null,
        deductions: structure.deductions ? JSON.parse(structure.deductions) : null,
      }, { status: 201 });
    }

    // Salary Structure - Update
    if (action === 'salary_structure_update') {
      const { id, ...updateData } = body || {};
      if (!id) return NextResponse.json({ error: 'Structure id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const data: any = {};
      if (updateData.jobTitle !== undefined) data.jobTitle = updateData.jobTitle;
      if (updateData.company !== undefined) data.company = updateData.company;
      if (updateData.baseSalary !== undefined) data.baseSalary = parseFloat(String(updateData.baseSalary));
      if (updateData.allowances !== undefined) data.allowances = updateData.allowances ? JSON.stringify(updateData.allowances) : null;
      if (updateData.deductions !== undefined) data.deductions = updateData.deductions ? JSON.stringify(updateData.deductions) : null;
      if (updateData.effectiveDate !== undefined) data.effectiveDate = new Date(updateData.effectiveDate);
      if (updateData.endDate !== undefined) data.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
      if (updateData.currency !== undefined) data.currency = updateData.currency;
      if (updateData.location !== undefined) data.location = updateData.location;
      if (updateData.department !== undefined) data.department = updateData.department;
      if (updateData.grade !== undefined) data.grade = updateData.grade;
      if (updateData.notes !== undefined) data.notes = updateData.notes;
      if (updateData.changeType !== undefined) data.changeType = updateData.changeType;
      if (updateData.changeReason !== undefined) data.changeReason = updateData.changeReason;
      const updated = await (prisma as any).salaryStructure.update({
        where: { id },
        data,
      });
      return NextResponse.json({
        ...updated,
        allowances: updated.allowances ? JSON.parse(updated.allowances) : null,
        deductions: updated.deductions ? JSON.parse(updated.deductions) : null,
      });
    }

    // Salary Structure - Delete
    if (action === 'salary_structure_delete') {
      const { id } = body || {};
      if (!id) return NextResponse.json({ error: 'Structure id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      await (prisma as any).salaryStructure.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Entity Mappings - Get
    if (action === 'entity_mappings_list') {
      const { userId, type } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const where: any = { userId };
      if (type) where.entityType = type;
      const mappings = await (prisma as any).entityMapping.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      const parsed = mappings.map((m: any) => ({
        ...m,
        mappedNames: m.mappedNames as any,
      }));
      return NextResponse.json(parsed);
    }

    // Entity Mappings - Create
    if (action === 'entity_mappings_create') {
      const { userId, canonicalName, mappedNames, entityType } = body || {};
      if (!userId || !canonicalName || !entityType) {
        return NextResponse.json({ error: 'userId, canonicalName, and entityType are required' }, { status: 400 });
      }
      if (!['PERSON', 'STORE'].includes(entityType)) {
        return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
      }
      const { prisma } = await import('@/lib/db');
      const namesArray = Array.isArray(mappedNames) ? mappedNames : [mappedNames].filter(Boolean);
      const existing = await (prisma as any).entityMapping.findFirst({
        where: {
          userId,
          canonicalName: canonicalName.trim(),
          entityType,
        },
      });
      let mapping;
      if (existing) {
        const existingNames = JSON.parse(existing.mappedNames || '[]');
        const mergedNames = Array.from(new Set([...existingNames, ...namesArray]));
        mapping = await (prisma as any).entityMapping.update({
          where: { id: existing.id },
          data: {
            mappedNames: mergedNames as any,
            updatedAt: new Date(),
          },
        });
      } else {
        mapping = await (prisma as any).entityMapping.create({
          data: {
            userId,
            canonicalName: canonicalName.trim(),
            mappedNames: namesArray as any,
            entityType,
          },
        });
      }
      return NextResponse.json({
        ...mapping,
        mappedNames: mapping.mappedNames as any,
      });
    }

    // Entity Mappings - Update
    if (action === 'entity_mappings_update') {
      const { id, canonicalName, mappedNames } = body || {};
      if (!id) return NextResponse.json({ error: 'Mapping id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const existing = await (prisma as any).entityMapping.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
      }
      const data: any = {};
      if (canonicalName !== undefined) data.canonicalName = canonicalName.trim();
      if (mappedNames !== undefined) {
        const namesArray = Array.isArray(mappedNames) ? mappedNames : [mappedNames].filter(Boolean);
        data.mappedNames = JSON.stringify(namesArray);
      }
      const updated = await (prisma as any).entityMapping.update({
        where: { id },
        data,
      });
      return NextResponse.json({
        ...updated,
        mappedNames: updated.mappedNames as any,
      });
    }

    // Entity Mappings - Delete
    if (action === 'entity_mappings_delete') {
      const { id } = body || {};
      if (!id) return NextResponse.json({ error: 'Mapping id is required' }, { status: 400 });
      const { prisma } = await import('@/lib/db');
      const existing = await (prisma as any).entityMapping.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
      }
      await (prisma as any).entityMapping.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Pincode Lookup
    if (action === 'pincode_lookup') {
      const { pincode } = body || {};
      if (!pincode) return NextResponse.json({ success: false, error: 'Pincode is required' }, { status: 400 });
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(pincode)) {
        return NextResponse.json({ success: false, error: 'Invalid pincode format. Please enter a 6-digit pincode.' }, { status: 400 });
      }
      const apiUrl = `http://www.postalpincode.in/api/pincode/${pincode}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return NextResponse.json({ success: false, error: 'Unable to fetch location data. Please try again later.' }, { status: response.status });
      }
      const data = await response.json();
      const result = Array.isArray(data) ? data[0] : data;
      if (result && result.Status === 'Success' && result.PostOffice && result.PostOffice.length > 0) {
        const postOffice = result.PostOffice[0];
        return NextResponse.json({
          success: true,
          pincode,
          city: postOffice.District || postOffice.Circle || '',
          state: postOffice.State || '',
          district: postOffice.District || '',
          postOffice: postOffice.Name || '',
        });
      }
      return NextResponse.json({ success: false, error: 'Pincode not found' }, { status: 404 });
    }

    // Clear Cache — SUPERUSER only
    if (action === 'clear_cache') {
      if (user?.role !== 'SUPERUSER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { stats = false } = body || {};
      const { clearAllCache, getCacheStats } = await import('@/lib/api-cache');
      const { cacheManager } = await import('@/lib/advanced-cache');
      const { clearCurrencyRatesCache, getCurrencyCacheStats } = await import('@/lib/currency-rates-cache');
      const clearedCaches: string[] = [];
      const cacheStats: Record<string, any> = {};
      if (stats) {
        const apiCacheStats = getCacheStats();
        cacheStats.apiCache = { size: apiCacheStats.size, entryCount: apiCacheStats.entries.length };
        try {
          cacheStats.advancedCache = cacheManager.getAllStats();
        } catch (error) {
          console.error('Error getting advanced cache stats:', error);
        }
        cacheStats.currencyRates = getCurrencyCacheStats();
      }
      try {
        const beforeSize = getCacheStats().size;
        clearAllCache();
        clearedCaches.push(`API Cache (${beforeSize} entries)`);
      } catch (error) {
        console.error('Error clearing API cache:', error);
      }
      try {
        const beforeStats = cacheManager.getAllStats();
        const totalEntries = Object.values(beforeStats).reduce((sum: number, stat: any) => sum + (stat.entries || 0), 0);
        cacheManager.clearAll();
        clearedCaches.push(`Advanced Cache Manager (${totalEntries} entries)`);
      } catch (error) {
        console.error('Error clearing advanced cache:', error);
      }
      try {
        const hadCache = getCurrencyCacheStats().hasCache;
        clearCurrencyRatesCache();
        if (hadCache) clearedCaches.push('Currency Rates Cache');
      } catch (error) {
        console.error('Error clearing currency rates cache:', error);
      }
      return NextResponse.json({
        success: true,
        message: 'All caches cleared successfully',
        cleared: clearedCaches,
        timestamp: new Date().toISOString(),
        ...(stats && { beforeClear: cacheStats }),
      });
    }

    // Wishlist Recommendations
    if (action === 'wishlist_recommendations') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      // Return sample recommendations structure
      const recommendations = {
        recommendations: [
          {
            itemId: 'iphone-15-pro',
            title: 'iPhone 15 Pro',
            currentPrice: 149999,
            priceHistory: [
              { date: '2024-01', price: 149999 },
              { date: '2024-02', price: 149999 },
              { date: '2024-03', price: 149999 },
            ],
            bestTimeToBuy: 'During festive sales (Oct-Nov)',
            pricePrediction: 'Price may drop by 10-15% during sales',
            alternatives: [
              { name: 'iPhone 14 Pro', price: 129999, url: '#' },
              { name: 'Samsung Galaxy S24', price: 119999, url: '#' },
            ],
          },
        ],
      };
      return NextResponse.json(recommendations);
    }

    // Goal Recommendations
    if (action === 'goal_recommendations') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      // Return sample recommendations structure
      const recommendations = {
        recommendations: [
          {
            goalId: 'emergency-fund',
            title: 'Emergency Fund Goal',
            recommendation: 'Start building an emergency fund with 3-6 months of expenses. Set aside ₹10,000 monthly.',
            estimatedSavings: 120000,
            timeframe: '12 months',
            priority: 'HIGH',
          },
        ],
        goals: [],
        suggestions: [],
      };
      return NextResponse.json(recommendations);
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error(`❌ Consolidated API Error [Action: ${body?.action}]:`, error);

    // Handle specific auth error messages to prevent generic 500s
    const msg = error.message || '';
    if (msg.includes('Account not verified')) {
      return NextResponse.json({
        error: msg,
        requiresVerification: true,
        email: body?.email
      }, { status: 403 });
    }
    if (msg.includes('Invalid email or password') || msg.includes('Email does not exist') || msg.includes('Password is incorrect')) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Unexpected error in consolidated API' },
      { status: 500 }
    );
  }
}


