import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { clearUserCache } from '@/lib/api-cache';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

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

    // Transactions - List (GET equivalent)
    if (action === 'transactions_list') {
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const {
        page = 1,
        pageSize: pageSizeParam = '50',
        includeTotals = false,
        type: financialCategoryParamRaw,
        categoryId,
        startDate,
        endDate,
        search: searchTerm,
        includeDeleted = false,
        sortField = 'transactionDate',
        sortDirection = 'desc',
        amountPreset,
        minAmount,
        maxAmount,
      } = body || {};

      const pageSize = pageSizeParam === 'all' ? 5000 : Math.min(parseInt(String(pageSizeParam || '50')), 5000);
      const skip = (Number(page) - 1) * pageSize;
      const allowedCategories = ['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER'] as const;
      const normalizedCategory = financialCategoryParamRaw?.toUpperCase() ?? null;
      const financialCategory = normalizedCategory && allowedCategories.includes(normalizedCategory as any)
        ? normalizedCategory
        : null;

      const where: any = { userId: user.id };
      if (!includeDeleted) where.isDeleted = false;
      if (financialCategory) where.financialCategory = financialCategory;
      if (categoryId) {
        if (categoryId === 'uncategorized') {
          where.categoryId = null;
        } else {
          where.categoryId = categoryId;
        }
      }
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        const isValidStart = start && !isNaN(start.getTime());
        const isValidEnd = end && !isNaN(end.getTime());

        if (isValidStart || isValidEnd) {
          where.transactionDate = {};
          if (isValidStart) where.transactionDate.gte = start;
          if (isValidEnd) {
            end!.setHours(23, 59, 59, 999);
            where.transactionDate.lte = end;
          }
        }
      }

      const validSortFields: Record<string, string> = {
        date: 'transactionDate',
        transactionDate: 'transactionDate',
        amount: 'creditAmount',
        description: 'description',
        category: 'category',
      };
      const dbSortField = validSortFields[sortField] || 'transactionDate';
      const orderBy: Record<string, 'asc' | 'desc'> = { [dbSortField]: sortDirection };

      // Search term filter (now applied at DB level for full pagination support)
      const hasSearchTerm = searchTerm && searchTerm.trim().length > 0;
      if (hasSearchTerm) {
        where.OR = [
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { store: { contains: searchTerm, mode: 'insensitive' } },
          { personName: { contains: searchTerm, mode: 'insensitive' } },
          { upiId: { contains: searchTerm, mode: 'insensitive' } },
          { notes: { contains: searchTerm, mode: 'insensitive' } },
          { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
        ];
      }

      // Fetch data in parallel
      const [transactionsData, totalCountData, totalsData] = await Promise.all([
        (prisma as any).transaction.findMany({
          where,
          include: {
            category: true,
            document: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                fileSize: true,
                visibility: true,
                sourceType: true,
                uploadedById: true,
                ownerId: true,
                bankCode: true,
                isDeleted: true,
                deletedAt: true,
              },
            },
          },
          orderBy,
          skip,
          take: pageSize,
        }),
        (prisma as any).transaction.count({ where }),
        includeTotals ? (async () => {
          const [incomeRes, expenseRes] = await Promise.all([
            (prisma as any).transaction.aggregate({
              where: { ...where, financialCategory: 'INCOME' },
              _sum: { creditAmount: true },
            }),
            (prisma as any).transaction.aggregate({
              where: { ...where, financialCategory: 'EXPENSE' },
              _sum: { debitAmount: true },
            }),
          ]);
          return {
            income: Number(incomeRes?._sum?.creditAmount || 0),
            expense: Number(expenseRes?._sum?.debitAmount || 0),
          };
        })() : Promise.resolve(null)
      ]);

      let transactions = transactionsData as any[];
      const totalCount = totalCountData;
      const totals = totalsData;


      // No need for in-memory searchTerm filter here as it's now in 'where'

      if (amountPreset) {
        transactions = transactions.filter((t: any) => {
          const amount = t.creditAmount > 0 ? t.creditAmount : t.debitAmount;
          switch (amountPreset) {
            case 'lt1k': return amount < 1000;
            case '1to10k': return amount >= 1000 && amount < 10000;
            case '10to50k': return amount >= 10000 && amount < 50000;
            case '50to100k': return amount >= 50000 && amount < 100000;
            case 'gt100k': return amount >= 100000;
            default: return true;
          }
        });
      }

      if (minAmount !== null && minAmount !== undefined) {
        transactions = transactions.filter((t: any) => {
          const amount = t.creditAmount > 0 ? t.creditAmount : t.debitAmount;
          return amount >= minAmount;
        });
      }

      if (maxAmount !== null && maxAmount !== undefined) {
        transactions = transactions.filter((t: any) => {
          const amount = t.creditAmount > 0 ? t.creditAmount : t.debitAmount;
          return amount <= maxAmount;
        });
      }

      const transformed = transactions.map((t: any) => ({
        ...t,
        creditAmount: Number(t.creditAmount),
        debitAmount: Number(t.debitAmount),
        balance: t.balance ? Number(t.balance) : null,
        category: t.category ? {
          id: t.category.id,
          name: t.category.name,
          type: t.category.type,
          color: t.category.color,
          icon: t.category.icon,
        } : null,
      }));

      return NextResponse.json({
        transactions: transformed,
        pagination: {
          total: totalCount,
          page: Number(page),
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        },
        totals,
      });
    }

    // Transactions - Create
    if (action === 'transactions_create') {
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const { getCanonicalName } = await import('@/lib/entity-mapping-service');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const {
        description,
        transactionDate,
        creditAmount = 0,
        debitAmount = 0,
        financialCategory = 'EXPENSE',
        categoryId,
        notes,
        store,
        personName,
        upiId,
        receiptUrl,
        bankCode,
        transactionId,
        accountNumber,
        transferType,
        branch,
        rawData,
        balance,
      } = body || {};

      if (!description || (!creditAmount && !debitAmount)) {
        return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 });
      }

      let finalStore = store;
      let finalPersonName = personName;
      try {
        if (store) finalStore = await getCanonicalName(user.id, store, 'STORE');
        if (personName) finalPersonName = await getCanonicalName(user.id, personName, 'PERSON');
      } catch { }

      const transaction = await (prisma as any).transaction.create({
        data: {
          userId: user.id,
          description,
          transactionDate: new Date(transactionDate || Date.now()),
          creditAmount: parseFloat(String(creditAmount)) || 0,
          debitAmount: parseFloat(String(debitAmount)) || 0,
          financialCategory: financialCategory.toUpperCase(),
          categoryId: categoryId || null,
          notes: notes || null,
          store: finalStore || null,
          personName: finalPersonName || null,
          upiId: upiId || null,
          receiptUrl: receiptUrl || null,
          bankCode: bankCode || null,
          transactionId: transactionId || null,
          accountNumber: accountNumber || null,
          transferType: transferType || null,
          branch: branch || null,
          rawData: rawData || null,
          balance: balance ? parseFloat(String(balance)) : null,
          isDeleted: false,
        },
        include: { category: true },
      });

      // Clear cache to ensure Advisor/Dashboard see new data
      await clearUserCache(user.id);

      return NextResponse.json({
        ...transaction,
        creditAmount: Number(transaction.creditAmount),
        debitAmount: Number(transaction.debitAmount),
        balance: transaction.balance ? Number(transaction.balance) : null,
      }, { status: 201 });
    }

    // Transactions - Update
    if (action === 'transactions_update') {
      const { id, ...updateData } = body || {};
      if (!id) return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const { getCanonicalName } = await import('@/lib/entity-mapping-service');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const existing = await (prisma as any).transaction.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

      let finalStore = updateData.store;
      let finalPersonName = updateData.personName;
      if (updateData.store || updateData.personName) {
        try {
          if (updateData.store && updateData.store !== existing.store) {
            finalStore = await getCanonicalName(user.id, updateData.store, 'STORE');
          }
          if (updateData.personName && updateData.personName !== existing.personName) {
            finalPersonName = await getCanonicalName(user.id, updateData.personName, 'PERSON');
          }
        } catch { }
      }

      const data: any = {};
      if (updateData.description !== undefined) data.description = updateData.description;
      if (updateData.transactionDate !== undefined) data.transactionDate = new Date(updateData.transactionDate);
      if (updateData.creditAmount !== undefined) data.creditAmount = parseFloat(String(updateData.creditAmount)) || 0;
      if (updateData.debitAmount !== undefined) data.debitAmount = parseFloat(String(updateData.debitAmount)) || 0;
      if (updateData.financialCategory !== undefined) data.financialCategory = updateData.financialCategory.toUpperCase();
      if (updateData.categoryId !== undefined) data.categoryId = updateData.categoryId || null;
      if (updateData.notes !== undefined) data.notes = updateData.notes || null;
      if (updateData.store !== undefined) data.store = finalStore || null;
      if (updateData.personName !== undefined) data.personName = finalPersonName || null;
      if (updateData.upiId !== undefined) data.upiId = updateData.upiId || null;
      if (updateData.receiptUrl !== undefined) data.receiptUrl = updateData.receiptUrl || null;
      if (updateData.bankCode !== undefined) data.bankCode = updateData.bankCode || null;
      if (updateData.transactionId !== undefined) data.transactionId = updateData.transactionId || null;
      if (updateData.accountNumber !== undefined) data.accountNumber = updateData.accountNumber || null;
      if (updateData.transferType !== undefined) data.transferType = updateData.transferType || null;
      if (updateData.branch !== undefined) data.branch = updateData.branch || null;
      if (updateData.rawData !== undefined) data.rawData = updateData.rawData || null;
      if (updateData.balance !== undefined) data.balance = updateData.balance ? parseFloat(String(updateData.balance)) : null;

      const updated = await (prisma as any).transaction.update({
        where: { id },
        data,
        include: { category: true },
      });

      // Clear cache
      await clearUserCache(user.id);

      return NextResponse.json({
        ...updated,
        creditAmount: Number(updated.creditAmount),
        debitAmount: Number(updated.debitAmount),
        balance: updated.balance ? Number(updated.balance) : null,
        category: updated.category ? {
          id: updated.category.id,
          name: updated.category.name,
          type: updated.category.type,
          color: updated.category.color,
          icon: updated.category.icon,
        } : null,
      });
    }

    // Transactions - Delete Single
    if (action === 'transactions_delete_single') {
      const { id } = body || {};
      if (!id) return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const existing = await (prisma as any).transaction.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

      const deleted = await (prisma as any).transaction.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // Clear cache
      await clearUserCache(user.id);

      return NextResponse.json({
        id: deleted.id,
        isDeleted: true,
        deletedAt: deleted.deletedAt,
      });
    }

    // Transactions - Delete Bulk
    if (action === 'transactions_delete_bulk') {
      const { transactionIds, filters } = body || {};
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      let deletedCount = 0;
      if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
        const result = await (prisma as any).transaction.updateMany({
          where: { id: { in: transactionIds }, userId: user.id, isDeleted: false },
          data: { isDeleted: true, deletedAt: new Date() },
        });
        deletedCount += result.count;
      }
      if (filters) {
        const where: any = { userId: user.id, isDeleted: false };
        if (filters.bankCode) where.bankCode = filters.bankCode;
        if (filters.transactionType === 'expense' || filters.transactionType === 'debit') {
          where.financialCategory = 'EXPENSE';
          where.debitAmount = { gt: 0 };
        } else if (filters.transactionType === 'income' || filters.transactionType === 'credit') {
          where.financialCategory = 'INCOME';
          where.creditAmount = { gt: 0 };
        }
        if (filters.startDate || filters.endDate) {
          where.transactionDate = {};
          if (filters.startDate) where.transactionDate.gte = new Date(filters.startDate);
          if (filters.endDate) where.transactionDate.lte = new Date(filters.endDate);
        }
        const result = await (prisma as any).transaction.updateMany({
          where,
          data: { isDeleted: true, deletedAt: new Date() },
        });
        deletedCount += result.count;
      }

      // Clear cache
      await clearUserCache(user.id);

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} transaction(s)`,
      });
    }

    // Transactions - Restore
    if (action === 'transactions_restore') {
      const { transactionIds, filters } = body || {};
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      let restoredCount = 0;
      if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
        const result = await (prisma as any).transaction.updateMany({
          where: { id: { in: transactionIds }, userId: user.id, isDeleted: true },
          data: { isDeleted: false, deletedAt: null },
        });
        restoredCount += result.count;
      }
      if (filters) {
        const where: any = { userId: user.id, isDeleted: true };
        if (filters.bankCode) where.bankCode = filters.bankCode;
        if (filters.transactionType === 'expense' || filters.transactionType === 'debit') {
          where.financialCategory = 'EXPENSE';
          where.debitAmount = { gt: 0 };
        } else if (filters.transactionType === 'income' || filters.transactionType === 'credit') {
          where.financialCategory = 'INCOME';
          where.creditAmount = { gt: 0 };
        }
        if (filters.startDate || filters.endDate) {
          where.transactionDate = {};
          if (filters.startDate) where.transactionDate.gte = new Date(filters.startDate);
          if (filters.endDate) where.transactionDate.lte = new Date(filters.endDate);
        }
        const result = await (prisma as any).transaction.updateMany({
          where,
          data: { isDeleted: false, deletedAt: null },
        });
        restoredCount += result.count;
      }

      return NextResponse.json({
        success: true,
        restoredCount,
        message: `Successfully restored ${restoredCount} transaction(s)`,
      });
    }



    // Transactions - Batch Update
    if (action === 'transactions_batch_update') {
      const { userId, updates } = body || {};
      if (!userId || !Array.isArray(updates) || updates.length === 0) {
        return NextResponse.json({ error: 'userId and updates array are required' }, { status: 400 });
      }
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const { getCanonicalName } = await import('@/lib/entity-mapping-service');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.id !== userId && user.role !== 'SUPERUSER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const transactionIds = updates.map((u: any) => u.id);
      const existingTransactions = await (prisma as any).transaction.findMany({
        where: { id: { in: transactionIds }, userId, isDeleted: false },
        select: { id: true, store: true, personName: true },
      });

      const existingIds = new Set(existingTransactions.map((t: any) => t.id));
      const invalidIds = transactionIds.filter((id: string) => !existingIds.has(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Some transactions not found or don't belong to user`, invalidIds },
          { status: 404 }
        );
      }

      const existingMap = new Map(
        existingTransactions.map((t: any) => [t.id, { store: t.store, personName: t.personName }])
      );

      const BATCH_SIZE = 50;
      const results: Array<{ id: string; success: boolean; error?: string }> = [];

      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (update: any) => {
          try {
            const updateData: any = {};
            if (update.categoryId !== undefined) updateData.categoryId = update.categoryId || null;
            if (update.financialCategory !== undefined) {
              updateData.financialCategory = update.financialCategory.toUpperCase();
            }
            if (update.description !== undefined) updateData.description = update.description;
            if (update.notes !== undefined) updateData.notes = update.notes || null;

            if (update.store !== undefined) {
              const existing = existingMap.get(update.id);
              if (update.store && update.store !== (existing as any)?.store) {
                try {
                  updateData.store = await getCanonicalName(userId, update.store, 'STORE');
                } catch {
                  updateData.store = update.store;
                }
              } else {
                updateData.store = update.store || null;
              }
            }

            if (update.personName !== undefined) {
              const existing = existingMap.get(update.id);
              if (update.personName && update.personName !== (existing as any)?.personName) {
                try {
                  updateData.personName = await getCanonicalName(userId, update.personName, 'PERSON');
                } catch {
                  updateData.personName = update.personName;
                }
              } else {
                updateData.personName = update.personName || null;
              }
            }

            await (prisma as any).transaction.update({
              where: { id: update.id },
              data: updateData,
            });

            return { id: update.id, success: true };
          } catch (error: any) {
            return {
              id: update.id,
              success: false,
              error: error.message || 'Update failed',
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(
          ...batchResults.map((result) =>
            result.status === 'fulfilled' ? result.value : { id: 'unknown', success: false, error: 'Promise rejected' }
          )
        );
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: true,
        total: updates.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      });
    }

    // Transactions - Auto Categorize (Smart Hybrid)
    if (action === 'transactions_auto_categorize') {
      const { AuthService } = await import('@/lib/auth');
      const { prisma } = await import('@/lib/db');
      const { categorizeTransactionsBatch } = await import('@/lib/gemini');

      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await AuthService.getUserFromToken(authToken.value);
      if (!user || !user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      try {
        // Fetch all categories to build a name->id lookup
        const allCategories = await (prisma as any).category.findMany({
          where: { OR: [{ userId: user.id }, { isDefault: true }] }
        });

        // Build category lookup by name (case-insensitive)
        const categoryByName = new Map<string, string>();
        allCategories.forEach((c: any) => {
          categoryByName.set(c.name.toLowerCase(), c.id);
        });

        // Find "Other" category ID to EXCLUDE from matching
        const otherCategoryId = allCategories.find((c: any) =>
          c.name.toLowerCase() === 'other' || c.name.toLowerCase() === 'miscellaneous'
        )?.id;

        // DETERMINISTIC RULES ENGINE - Using EXACT category names from database
        // Categories: salary, freelance, investment, business, other income, housing, food, 
        // transportation, utilities, entertainment, healthcare, education, shopping, insurance,
        // other expenses, food & dining, personal care, travel, subscriptions, debt payment, taxes
        const PATTERN_RULES: Array<[string[], string]> = [
          // ===== BANK CHARGES & FEES → 'other expenses' =====
          [['min bal chg', 'minimum balance', 'service charge', 'atm amc', 'uncoll chrg', 'sms chg', 'annual fee', 'maintenance charge', 'eft charge'], 'other expenses'],

          // ===== ATM WITHDRAWAL / CASH → 'other expenses' =====
          [['atm wdl', 'tran date', 'atm id', 'cash withdrawal', 'self-', '/self'], 'other expenses'],

          // ===== INCOME → 'salary' or 'other income' =====
          [['credit interest', 'interest credit', 'neft/hdfc', 'word publish'], 'other income'],
          [['salary', 'credited'], 'salary'],

          // ===== GROCERIES & DAILY NEEDS → 'food' =====
          [['milk', 'dud', 'dudh', 'aata', 'atta', 'grocery', 'kirana', 'vegetables', 'sabzi', 'fruits', 'eggs', 'anda', 'rice', 'dal', 'sugar', 'tel', 'oil', 'ghee', 'paneer', 'dahi', 'curd', 'aloo', 'pyaz', 'tamatar', 'soyabean'], 'food'],

          // ===== FOOD & SNACKS → 'food & dining' =====
          [['paan', 'panipuri', 'chai', 'tea', 'samosa', 'snacks', 'vada', 'poha', 'nashta', 'breakfast', 'lunch', 'dinner', 'hotel', 'dhaba', 'restaurant', 'biryani', 'thali', 'meals', 'frooti', 'cold drink', 'juice', 'dhaniya', 'bhindi'], 'food & dining'],
          [['swiggy', 'zomato', 'dominos', 'pizza', 'mcdonalds', 'kfc', 'burger king', 'starbucks', 'cafe', 'subway'], 'food & dining'],

          // ===== SWEETS & BAKERY → 'food & dining' =====
          [['sweets', 'mithai', 'bakery', 'cake', 'pastry', 'dryfruit', 'dry fruit', 'chocolate', 'dairy milk'], 'food & dining'],

          // ===== MEDICAL / HEALTHCARE → 'healthcare' =====
          [['medical', 'medico', 'pharmacy', 'medicine', 'chemist', 'hospital', 'clinic', 'doctor', 'apollo', 'medplus', '1mg', 'pharmeasy', 'netmeds', 'diagnostic', 'lab', 'cipladine', 'tablet', 'dawai'], 'healthcare'],

          // ===== UTILITIES & RECHARGE → 'utilities' =====
          [['recharge', 'gpayrecharge', 'vodaf', 'airtel', 'jio', 'bsnl', 'electricity', 'bijli', 'gas', 'lpg', 'water bill', 'broadband', 'wifi', 'internet', 'dth', 'tata sky', 'dish tv'], 'utilities'],

          // ===== TRANSPORT → 'transportation' =====
          [['uber', 'ola', 'rapido', 'taxi', 'cab', 'metro', 'railway', 'indian railways', 'irctc', 'bus', 'petrol', 'diesel', 'fuel', 'cng', 'parking', 'toll'], 'transportation'],

          // ===== SHOPPING → 'shopping' =====
          [['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'bigbasket', 'blinkit', 'zepto', 'instamart', 'jiomart', 'dmart', 'shopping', 'cloth', 'kapda', 'footwear', 'shoe'], 'shopping'],

          // ===== ENTERTAINMENT → 'entertainment' =====
          [['netflix', 'hotstar', 'spotify', 'prime video', 'youtube', 'bookmyshow', 'cinema', 'pvr', 'inox', 'movie', 'game'], 'entertainment'],

          // ===== SUBSCRIPTIONS → 'subscriptions' =====
          [['subscription', 'monthly', 'renewal', 'autopay'], 'subscriptions'],

          // ===== GIFTS → 'gifts & donations' =====
          [['gift', 'rakhi', 'shagun', 'mehendi', 'henna', 'birthday', 'anniversary', 'festival', 'donation', 'charity'], 'gifts & donations'],

          // ===== PERSONAL CARE → 'personal care' =====
          [['salon', 'parlour', 'haircut', 'beauty', 'wheel', 'dettol', 'soap', 'shampoo', 'gum', 'prints', 'stationery'], 'personal care'],

          // ===== INVESTMENTS → 'investment' =====
          [['zerodha', 'groww', 'upstox', 'mutual fund', 'sip', 'fd', 'stock', 'trading'], 'investment'],

          // ===== INSURANCE → 'insurance' =====
          [['insurance', 'lic', 'policy', 'premium'], 'insurance'],

          // ===== EDUCATION → 'education' =====
          [['school', 'college', 'tuition', 'coaching', 'course', 'training'], 'education'],

          // ===== HOUSING → 'housing' =====
          [['rent', 'landlord', 'society', 'maintenance', 'flat', 'apartment'], 'housing'],

          // ===== LOANS & EMI → 'debt payment' =====
          [['emi', 'loan', 'bajaj finserv', 'repayment'], 'debt payment'],

          // ===== TRAVEL → 'travel' =====
          [['hotel', 'oyo', 'booking', 'airbnb', 'trip', 'vacation', 'holiday', 'flight', 'airline'], 'travel'],

          // ===== TAXES → 'taxes' =====
          [['tax', 'gst', 'income tax', 'tds'], 'taxes'],
        ];

        // Category fallback mappings (if pattern name doesn't match, try these)
        const CATEGORY_FALLBACKS: Record<string, string[]> = {
          'bank charges': ['bank fees', 'charges', 'fees', 'other'],
          'cash': ['cash withdrawal', 'atm', 'other'],
          'income': ['salary', 'earnings', 'other income', 'income'],
          'groceries': ['grocery', 'food', 'food & dining', 'shopping'],
          'food & dining': ['food', 'dining', 'restaurants', 'eating out'],
          'healthcare': ['medical', 'health', 'pharmacy'],
          'utilities': ['bills', 'recharge', 'mobile'],
          'transport': ['travel', 'transportation', 'commute'],
          'shopping': ['personal', 'lifestyle'],
          'entertainment': ['subscriptions', 'leisure'],
          'gifts': ['gifts & donations', 'personal'],
          'personal care': ['lifestyle', 'personal', 'shopping'],
          'investments': ['savings', 'finance'],
          'insurance': ['finance', 'other'],
          'education': ['learning', 'other'],
          'housing': ['rent', 'home', 'other'],
          'emi & loans': ['emi', 'loans', 'finance'],
        };

        // Helper to find category by pattern
        // Improved: Removes all non-alphanumeric chars for matching (handles "mil k", "pay-tm", "gro.cery")
        const findCategoryByPattern = (text: string): string | null => {
          const lowerText = text.toLowerCase();
          const cleanText = lowerText.replace(/[^a-z0-9]/g, ''); // "mil K!" -> "milk"

          for (const [keywords, categoryName] of PATTERN_RULES) {
            for (const keyword of keywords) {
              const cleanKeyword = keyword.replace(/[^a-z0-9]/g, '');
              if (cleanKeyword.length < 3) continue; // Skip very short keywords to avoid false positives

              // match if clean keyword is found in clean text
              if (cleanText.includes(cleanKeyword)) {
                // Found keyword match! Now find category ID

                // 1. Try exact category name match
                for (const [catName, catId] of categoryByName.entries()) {
                  if (catName === categoryName.toLowerCase()) {
                    if (catId !== otherCategoryId) return catId;
                  }
                }

                // 2. Try partial category name match
                for (const [catName, catId] of categoryByName.entries()) {
                  if (catName.includes(categoryName.toLowerCase()) || categoryName.toLowerCase().includes(catName)) {
                    if (catId !== otherCategoryId) return catId;
                  }
                }

                // 3. Try fallback category names
                const fallbacks = CATEGORY_FALLBACKS[categoryName] || [];
                for (const fallback of fallbacks) {
                  for (const [catName, catId] of categoryByName.entries()) {
                    if (catName.includes(fallback) || fallback.includes(catName)) {
                      if (catId !== otherCategoryId) return catId;
                    }
                  }
                }
              }
            }
          }
          return null;
        };

        // DEBUG: Log categories available
        console.log('[AutoCat] Categories available:', Array.from(categoryByName.keys()));

        // Fetch Batch of Uncategorized
        const batchSize = 100;
        const transactions = await (prisma as any).transaction.findMany({
          where: { userId: user.id, categoryId: null, isDeleted: false },
          take: batchSize,
          select: { id: true, description: true, debitAmount: true, creditAmount: true, store: true }
        });

        const totalRemaining = await (prisma as any).transaction.count({
          where: { userId: user.id, categoryId: null, isDeleted: false }
        });

        if (transactions.length === 0) {
          // Debug: Count total and categorized separately
          const totalTx = await (prisma as any).transaction.count({
            where: { userId: user.id, isDeleted: false }
          });
          const categorizedTx = await (prisma as any).transaction.count({
            where: { userId: user.id, isDeleted: false, categoryId: { not: null } }
          });

          return NextResponse.json({
            processed: 0, updated: 0, rulesMatched: 0, aiMatched: 0, remaining: 0,
            message: 'No uncategorized transactions found for this user',
            debug: {
              userId: user.id,
              userTransactions: totalTx,
              userCategorized: categorizedTx,
              userUncategorized: totalTx - categorizedTx,
              categories: Array.from(categoryByName.keys()).slice(0, 10)
            }
          });
        }

        // Apply Pattern Matching FIRST (deterministic, no AI needed)
        const aiBatch: any[] = [];
        const updates: Array<{ id: string, categoryId: string, method: 'RULE' | 'AI' }> = [];

        for (const t of transactions) {
          const fullText = ((t.description || '') + ' ' + (t.store || '')).toLowerCase();

          // Try pattern matching first
          const matchedCategoryId = findCategoryByPattern(fullText);

          if (matchedCategoryId) {
            updates.push({ id: t.id, categoryId: matchedCategoryId, method: 'RULE' });
          } else {
            aiBatch.push(t);
          }
        }

        // AI Fallback for truly unmatched (ENABLE for all batches, processing locally limited if needed)
        // We'll process up to 30 items for AI to prevent token limits, but won't skip entirely
        if (aiBatch.length > 0) {
          const aiProcessBatch = aiBatch.slice(0, 40); // Process chunk of 40 max per request to be safe with tokens
          const categories = allCategories.filter((c: any) =>
            c.id !== otherCategoryId &&
            !c.name.toLowerCase().includes('miscellaneous')
          );

          const mappedForAi = aiProcessBatch.map((t: any) => ({
            id: t.id, description: t.description,
            amount: Number(t.debitAmount || t.creditAmount), store: t.store || undefined
          }));

          try {
            console.log(`[AI Batch] Sending ${mappedForAi.length} items to AI`);
            const aiResults = await categorizeTransactionsBatch(mappedForAi, categories.map((c: any) => ({ id: c.id, name: c.name, type: c.type })));

            console.log(`[AI Batch] Received ${aiResults.length} results`);
            if (aiResults.length > 0) console.log(`[AI Batch] Sample result:`, aiResults[0]);

            for (const res of aiResults) {
              if (res.categoryId && res.confidence > 0.5 && res.categoryId !== otherCategoryId) {
                updates.push({ id: res.id, categoryId: res.categoryId, method: 'AI' });
              }
            }
          } catch (e) {
            console.error("AI Batch failed (exception)", e);
          }
        }

        // Execute Updates
        let updatedCount = 0;
        let rulesCount = 0;
        let aiCount = 0;

        await Promise.all(updates.map(async (u) => {
          try {
            await (prisma as any).transaction.update({ where: { id: u.id }, data: { categoryId: u.categoryId } });
            updatedCount++;
            if (u.method === 'RULE') rulesCount++; else aiCount++;
          } catch (e) { }
        }));

        await clearUserCache(user.id);

        return NextResponse.json({
          message: 'Categorization complete',
          processed: transactions.length,
          updated: updatedCount,
          rulesMatched: rulesCount,
          aiMatched: aiCount,
          remaining: Math.max(0, totalRemaining - transactions.length),
          unmatched: aiBatch.length - aiCount,
          debug: {
            categoriesAvailable: Array.from(categoryByName.keys()),
            patternsActive: PATTERN_RULES.length,
            sampleUnmatched: aiBatch.slice(0, 3).map((t: any) => ({
              id: t.id.substring(0, 10),
              desc: (t.description || '').substring(0, 80),
              store: t.store
            }))
          }
        });

      } catch (err: any) {
        console.error("Auto categorize error:", err);
        return NextResponse.json({ error: err.message || 'Auto categorization failed' }, { status: 500 });
      }
    }

    // Transactions - Categorize
    if (action === 'transactions_categorize') {
      const { userId, transactions: transactionsToCategorize } = body || {};
      if (!userId || !Array.isArray(transactionsToCategorize) || transactionsToCategorize.length === 0) {
        return NextResponse.json(
          { error: 'userId and transactions array are required' },
          { status: 400 }
        );
      }
      const { AuthService } = await import('@/lib/auth');
      const { categorizeTransactions } = await import('@/lib/transaction-categorization-service');
      const authToken = request.cookies.get('auth-token');
      if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const actorRecord = authToken ? (await AuthService.getUserFromToken(authToken.value)) as any : null;
      const actorRole = (actorRecord as { role?: 'USER' | 'SUPERUSER' } | null)?.role;
      if (!actorRecord || !actorRecord.isActive || (actorRole !== 'SUPERUSER' && actorRecord.id !== userId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const results = await categorizeTransactions(userId, transactionsToCategorize);
      return NextResponse.json(results);
    }

    // Transactions - Categorize Background Status (simplified - just returns status)
    if (action === 'transactions_categorize_background_status') {
      const { userId, transactionIds } = body || {};
      if (!userId || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return NextResponse.json(
          { error: 'userId and transactionIds array are required' },
          { status: 400 }
        );
      }
      // This is a simplified status check - actual background processing happens in the categorize route
      // For now, return a placeholder status
      return NextResponse.json({
        progress: 0,
        categorized: 0,
        total: transactionIds.length,
        remaining: transactionIds.length,
      });
    }

    // Auth - Login
    if (action === 'auth_login') {
      const { email, password } = body || {};
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }
      const { AuthService } = await import('@/lib/auth');
      const { writeAuditLog, extractRequestMeta } = await import('@/lib/audit');
      const result = await AuthService.loginUser(email, password);
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        user: result.user,
      });
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });
      const meta = extractRequestMeta(request);
      await writeAuditLog({
        actorId: result.user.id,
        event: 'USER_LOGIN',
        severity: 'INFO',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        message: `${result.user.email} signed in`,
      });
      return response;
    }

    // Auth - Register
    if (action === 'auth_register') {
      const { email, password, name } = body || {};
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
      const { AuthService } = await import('@/lib/auth');
      try {
        const result = await AuthService.registerUser(email, password, name);
        const response = NextResponse.json(
          { message: 'User registered successfully', user: result.user },
          { status: 201 }
        );
        response.cookies.set('auth-token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        });
        return response;
      } catch (error: any) {
        if (error.message === 'User already exists with this email') {
          return NextResponse.json({ error: 'User already exists with this email' }, { status: 409 });
        }
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
      const response = NextResponse.json({ message: 'Logged out successfully' });
      response.cookies.delete('auth-token');
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

    // Dashboard
    if (action === 'dashboard_get') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { RealDataService } = await import('@/lib/real-data-service');
      const dashboardData = await RealDataService.getDashboardData(userId);
      return NextResponse.json(dashboardData);
    }

    // Dashboard Simple
    if (action === 'dashboard_simple_get') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { RealDataService } = await import('@/lib/real-data-service');
      const dashboardData = await RealDataService.getDashboardData(userId);
      return NextResponse.json(dashboardData);
    }

    // Dashboard Fallback
    if (action === 'dashboard_fallback_get') {
      const { userId } = body || {};
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      const { RealDataService } = await import('@/lib/real-data-service');
      const dashboardData = await RealDataService.getDashboardData(userId);
      return NextResponse.json(dashboardData);
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

    // Clear Cache
    if (action === 'clear_cache') {
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
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error in consolidated API' },
      { status: 500 }
    );
  }
}


