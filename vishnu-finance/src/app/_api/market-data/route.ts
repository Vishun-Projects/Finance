import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Return sample market data structure that matches ReportsManagement expectations
    const marketData = {
      data: [
        {
          symbol: 'NIFTY 50',
          price: 22500,
          change: 0.85,
          changePercent: 0.85,
          marketCap: 1250000000000
        },
        {
          symbol: 'SENSEX',
          price: 74000,
          change: -0.32,
          changePercent: -0.32,
          marketCap: 1850000000000
        },
        {
          symbol: 'BANKNIFTY',
          price: 48500,
          change: 1.25,
          changePercent: 1.25,
          marketCap: 850000000000
        },
        {
          symbol: 'RELIANCE',
          price: 2850,
          change: 0.45,
          changePercent: 0.45,
          marketCap: 185000000000
        },
        {
          symbol: 'TCS',
          price: 3850,
          change: -0.75,
          changePercent: -0.75,
          marketCap: 145000000000
        },
        {
          symbol: 'HDFC BANK',
          price: 1650,
          change: 0.92,
          changePercent: 0.92,
          marketCap: 125000000000
        }
      ],
      indices: [],
      stocks: [],
      commodities: [],
      currencies: []
    };

    return NextResponse.json(marketData);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
