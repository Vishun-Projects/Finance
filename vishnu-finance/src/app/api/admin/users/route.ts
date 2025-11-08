import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';

async function requireSuperuser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (await AuthService.getUserFromToken(token.value)) as any;
  if (!user || !user.isActive || user.role !== 'SUPERUSER') {
    return null;
  }
  return user;
}

function isMissingStatusColumn(error: unknown) {
  return error instanceof Error && error.message.includes('Unknown field `status`');
}

export async function GET(request: NextRequest) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const search = params.get('search') ?? '';
    const roleParam = params.get('role');
    const statusParam = params.get('status');
    const userStatus = params.get('userStatus') as 'ACTIVE' | 'FROZEN' | 'SUSPENDED' | null;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleParam === 'USER' || roleParam === 'SUPERUSER') {
      where.role = roleParam;
    }

    if (statusParam === 'active') {
      where.isActive = true;
    } else if (statusParam === 'inactive') {
      where.isActive = false;
    }

    if (userStatus) {
      where.status = userStatus;
    }

    const query = {
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        _count: {
          select: {
            uploadedDocuments: true,
            transactions: true,
          },
        },
        uploadedDocuments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 1,
          select: { transactionDate: true },
        },
        accountStatements: {
          orderBy: { importedAt: 'desc' },
          take: 1,
          select: { importedAt: true },
        },
      },
    } as const;

    let usersResult: unknown;
    try {
      usersResult = await prisma.user.findMany(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query as any
      );
    } catch (error) {
      if (!isMissingStatusColumn(error)) {
        throw error;
      }

      if (statusParam || userStatus) {
        return NextResponse.json(
          { error: 'User status filters require the latest database migration. Please run prisma migrate.' },
          { status: 409 },
        );
      }

      console.warn('⚠️ Admin users API - status column missing, falling back to legacy schema');
      const { status: _status, ...legacySelect } = query.select as Record<string, unknown>;
      void _status;
      const legacyQuery = {
        ...query,
        select: legacySelect,
      };
      usersResult = await prisma.user.findMany(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        legacyQuery as any
      );
      usersResult = (usersResult as Array<Record<string, unknown>>).map(user => ({ ...user, status: 'ACTIVE' }));
    }

    const usersArray = usersResult as Array<{
      id: string;
      email: string;
      name: string | null;
      role?: 'USER' | 'SUPERUSER';
      isActive: boolean;
      status?: 'ACTIVE' | 'FROZEN' | 'SUSPENDED';
      createdAt: Date;
      updatedAt: Date;
      lastLogin: Date | null;
      _count?: { uploadedDocuments?: number; transactions?: number };
      uploadedDocuments?: { createdAt: Date }[];
      transactions?: { transactionDate: Date | null }[];
      accountStatements?: { importedAt: Date | null }[];
    }>;

    const payload = usersArray.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? 'USER',
      isActive: user.isActive,
      status: user.status ?? 'ACTIVE',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      documentsCount: user._count?.uploadedDocuments ?? 0,
      transactionsCount: user._count?.transactions ?? 0,
      lastDocumentAt: user.uploadedDocuments?.[0]?.createdAt ?? null,
      lastTransactionAt: user.transactions?.[0]?.transactionDate ?? null,
      lastStatementAt: user.accountStatements?.[0]?.importedAt ?? null,
    }));

    return NextResponse.json({ users: payload });
  } catch (error) {
    console.error('Admin users fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to load users' },
      { status: 500 },
    );
  }
}

