import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { loadDashboard } from '@/features/dashboard/loaders';
import { loadScaledMoneyPlanForUser } from '@/lib/plan-income';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) return null;
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [scaledPlan, dashboard] = await Promise.all([
      loadScaledMoneyPlanForUser(user.id),
      loadDashboard(user.id),
    ]);

    const { adherence, disciplineSummary, planIncomeContext } = dashboard;

    return NextResponse.json({
      takeHome: scaledPlan.baseIncome,
      source: scaledPlan.source,
      activeSalaryTakeHome: planIncomeContext.activeSalaryTakeHome,
      currentMonthSalaryReceived: planIncomeContext.currentMonthSalaryReceived,
      lastMonthSalaryReceived: planIncomeContext.lastMonthSalaryReceived,
      receivedSalaryAnchor: planIncomeContext.receivedSalaryAnchor,
      receivedSalarySource: planIncomeContext.receivedSalarySource,
      plannedTotal: adherence.plannedTotal,
      actualTotal: adherence.actualTotal,
      headroom: disciplineSummary.capacity.headroom,
      underspend: disciplineSummary.capacity.underspend,
      available: disciplineSummary.capacity.available,
      overallScore: adherence.overallScore,
      monthLabel: adherence.monthLabel,
    });
  } catch (error) {
    console.error('[plan-preview]', error);
    return NextResponse.json({ error: 'Failed to load plan preview' }, { status: 500 });
  }
}
