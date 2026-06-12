import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { rejectForeignUserId } from '@/lib/api-user-scope';

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const forbidden = rejectForeignUserId(user, searchParams.get('userId'));
    if (forbidden) return forbidden;

    const salaryHistory = await (prisma as any).salaryHistory.findMany({
      where: { userId: user.id },
      orderBy: { effectiveDate: 'desc' },
      include: { salaryStructure: true },
    });

    return NextResponse.json(salaryHistory);
  } catch (error) {
    console.error('Error fetching salary history:', error);
    return NextResponse.json({ error: 'Failed to fetch salary history' }, { status: 500 });
  }
});
