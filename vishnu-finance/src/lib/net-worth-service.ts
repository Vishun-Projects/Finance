import { prisma } from './db';
import { getCurrentAccountBalance } from './account-balance-service';

export interface NetWorthBreakdown {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  bankBalance: number;
  manualAssets: number;
  manualLiabilities: number;
  assets: Array<{
    id: string;
    name: string;
    type: string;
    value: number;
    asOfDate: string;
  }>;
  liabilities: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    asOfDate: string;
  }>;
}

export async function computeNetWorth(userId: string): Promise<NetWorthBreakdown> {
  const [assets, liabilities, bankBalance] = await Promise.all([
    prisma.userAsset.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.userLiability.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    }),
    getCurrentAccountBalance(userId).catch(() => null),
  ]);

  const bankBal = bankBalance?.amount ?? 0;
  const manualAssets = assets.reduce((s, a) => s + Number(a.value), 0);
  const manualLiabilities = liabilities.reduce((s, l) => s + Number(l.balance), 0);
  const totalAssets = manualAssets + bankBal;
  const totalLiabilities = manualLiabilities;

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    bankBalance: bankBal,
    manualAssets,
    manualLiabilities,
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      value: Number(a.value),
      asOfDate: a.asOfDate.toISOString(),
    })),
    liabilities: liabilities.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      balance: Number(l.balance),
      asOfDate: l.asOfDate.toISOString(),
    })),
  };
}
