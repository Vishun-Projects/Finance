import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch salary history from database using type assertion
    const salaryHistory = await (prisma as any).salaryHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        salaryStructure: true
      }
    });

    return NextResponse.json(salaryHistory);
  } catch (error) {
    console.error('Error fetching salary history:', error);
    return NextResponse.json({ error: 'Failed to fetch salary history' }, { status: 500 });
  }
}
