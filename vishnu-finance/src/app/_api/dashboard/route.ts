import { NextRequest, NextResponse } from 'next/server';
import { RealDataService } from '../../../lib/real-data-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching REAL dashboard data for user:', userId);
    const dashboardData = await RealDataService.getDashboardData(userId);
    
    console.log('Successfully fetched real data:', {
      totalIncome: dashboardData.totalIncome,
      totalExpenses: dashboardData.totalExpenses,
      netSavings: dashboardData.netSavings,
      transactionsCount: dashboardData.recentTransactions.length,
      goalsCount: dashboardData.activeGoals
    });
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
