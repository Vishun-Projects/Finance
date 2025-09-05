import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Return sample goal recommendations structure that matches ReportsManagement expectations
    const recommendations = {
      recommendations: [
        {
          goalId: "emergency-fund",
          title: "Emergency Fund Goal",
          recommendation: "Start building an emergency fund with 3-6 months of expenses. Set aside ₹10,000 monthly.",
          estimatedSavings: 120000,
          timeframe: "12 months",
          priority: "HIGH"
        },
        {
          goalId: "debt-reduction",
          title: "Debt Reduction",
          recommendation: "Focus on paying off high-interest debt first. Consider debt consolidation for better rates.",
          estimatedSavings: 50000,
          timeframe: "6 months",
          priority: "CRITICAL"
        },
        {
          goalId: "investment-portfolio",
          title: "Investment Portfolio",
          recommendation: "Begin investing in diversified mutual funds or ETFs. Start with ₹5,000 monthly SIP.",
          estimatedSavings: 60000,
          timeframe: "12 months",
          priority: "MEDIUM"
        }
      ],
      goals: [],
      suggestions: []
    };

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error generating goal recommendations:', error);
    return NextResponse.json({ error: 'Failed to generate goal recommendations' }, { status: 500 });
  }
}
