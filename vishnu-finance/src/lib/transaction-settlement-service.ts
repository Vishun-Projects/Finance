import { prisma } from '@/lib/db';
import type { SettlementType } from '@prisma/client';

export type { SettlementType };

export interface SettlementTransactionRow {
  id: string;
  financialCategory: string;
  creditAmount: number;
  debitAmount: number;
  transactionDate?: Date;
  description?: string | null;
  personName?: string | null;
  categoryName?: string | null;
}

export interface SettlementGroup {
  id: string;
  label: string | null;
  type: SettlementType;
  members: SettlementTransactionRow[];
}

export interface SettlementNetResult {
  netExpense: number;
  netIncome: number;
}

export interface SettlementSummary {
  settlementId: string;
  type: SettlementType;
  label: string | null;
  transactionIds: string[];
  netExpense: number;
  netIncome: number;
}

export interface SettlementLookup {
  byTransactionId: Map<string, SettlementSummary>;
  groups: SettlementGroup[];
}

const AMOUNT_TOLERANCE = 1;

function emptySettlementLookup(): SettlementLookup {
  return { byTransactionId: new Map(), groups: [] };
}

export function isSettlementSchemaMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const prismaError = error as { code?: string; message?: string };
  return (
    prismaError.code === 'P2021'
    || (typeof prismaError.message === 'string'
      && prismaError.message.includes('transaction_settlements'))
  );
}

export const SETTLEMENT_MIGRATION_HINT =
  'Settlement tables are missing. Run: npx prisma db push && npx prisma generate';

export function computeSettlementNet(
  type: SettlementType,
  members: SettlementTransactionRow[],
): SettlementNetResult {
  const totalDebits = members.reduce((sum, m) => sum + (Number(m.debitAmount) || 0), 0);
  const totalCredits = members.reduce((sum, m) => sum + (Number(m.creditAmount) || 0), 0);

  switch (type) {
    case 'BORROW_REPAY':
      return {
        netExpense: Math.max(0, totalDebits - totalCredits),
        netIncome: Math.max(0, totalCredits - totalDebits),
      };
    case 'LEND_RETURN':
    case 'EXPENSE_REFUND':
      return {
        netExpense: Math.max(0, totalDebits - totalCredits),
        netIncome: 0,
      };
    case 'OTHER':
    default:
      return {
        netExpense: Math.max(0, totalDebits - totalCredits),
        netIncome: Math.max(0, totalCredits - totalDebits),
      };
  }
}

export function getEffectiveExpenseAmounts(
  transactions: Array<{ id: string; amount: number }>,
  lookup: SettlementLookup,
): Map<string, number> {
  const effective = new Map<string, number>();
  const handled = new Set<string>();

  for (const group of lookup.groups) {
    const net = computeSettlementNet(group.type, group.members);
    const debitMembers = group.members
      .filter((m) => Number(m.debitAmount) > 0)
      .sort((a, b) => Number(b.debitAmount) - Number(a.debitAmount));

    for (const member of group.members) {
      handled.add(member.id);
      effective.set(member.id, 0);
    }

    if (net.netExpense > 0 && debitMembers.length > 0) {
      effective.set(debitMembers[0].id, net.netExpense);
    }
  }

  for (const tx of transactions) {
    if (!handled.has(tx.id)) {
      effective.set(tx.id, tx.amount);
    }
  }

  return effective;
}

export function getEffectiveIncomeAmount(
  creditAmount: number,
  transactionId: string,
  lookup: SettlementLookup,
): number {
  const summary = lookup.byTransactionId.get(transactionId);
  if (!summary) return creditAmount;

  const group = lookup.groups.find((g) => g.id === summary.settlementId);
  if (!group) return creditAmount;

  const net = computeSettlementNet(group.type, group.members);
  if (net.netIncome <= 0) return 0;

  const incomeMembers = group.members.filter((m) => Number(m.creditAmount) > 0);
  const totalIncomeCredits = incomeMembers.reduce((sum, m) => sum + Number(m.creditAmount), 0);
  if (totalIncomeCredits <= 0) return 0;

  const share = Number(creditAmount) / totalIncomeCredits;
  return Math.round(net.netIncome * share * 100) / 100;
}

export function getEffectiveExpenseAmount(
  debitAmount: number,
  transactionId: string,
  lookup: SettlementLookup,
): number {
  const summary = lookup.byTransactionId.get(transactionId);
  if (!summary) return debitAmount;

  const group = lookup.groups.find((g) => g.id === summary.settlementId);
  if (!group) return debitAmount;

  const net = computeSettlementNet(group.type, group.members);
  const debitMembers = group.members
    .filter((m) => Number(m.debitAmount) > 0)
    .sort((a, b) => Number(b.debitAmount) - Number(a.debitAmount));

  if (net.netExpense <= 0) return 0;
  if (debitMembers[0]?.id !== transactionId) return 0;

  return net.netExpense;
}

function mapSettlementRow(tx: {
  id: string;
  financialCategory: string;
  creditAmount: unknown;
  debitAmount: unknown;
  transactionDate: Date;
  description: string | null;
  personName: string | null;
  category: { name: string } | null;
}): SettlementTransactionRow {
  return {
    id: tx.id,
    financialCategory: tx.financialCategory,
    creditAmount: Number(tx.creditAmount) || 0,
    debitAmount: Number(tx.debitAmount) || 0,
    transactionDate: tx.transactionDate,
    description: tx.description,
    personName: tx.personName,
    categoryName: tx.category?.name ?? null,
  };
}

export async function loadSettlementLookup(
  userId: string,
  start: Date,
  end: Date,
): Promise<SettlementLookup> {
  try {
    const settlements = await prisma.transactionSettlement.findMany({
      where: {
        userId,
        members: {
          some: {
            transaction: {
              isDeleted: false,
              transactionDate: { gte: start, lte: end },
            },
          },
        },
      },
      include: {
        members: {
          include: {
            transaction: {
              select: {
                id: true,
                financialCategory: true,
                creditAmount: true,
                debitAmount: true,
                transactionDate: true,
                description: true,
                personName: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const groups: SettlementGroup[] = settlements.map((settlement) => ({
      id: settlement.id,
      label: settlement.label,
      type: settlement.type,
      members: settlement.members.map((member) => mapSettlementRow(member.transaction)),
    }));

    const byTransactionId = new Map<string, SettlementSummary>();
    for (const group of groups) {
      const net = computeSettlementNet(group.type, group.members);
      const summary: SettlementSummary = {
        settlementId: group.id,
        type: group.type,
        label: group.label,
        transactionIds: group.members.map((m) => m.id),
        netExpense: net.netExpense,
        netIncome: net.netIncome,
      };
      for (const member of group.members) {
        byTransactionId.set(member.id, summary);
      }
    }

    return { byTransactionId, groups };
  } catch (error) {
    if (isSettlementSchemaMissingError(error)) {
      return emptySettlementLookup();
    }
    throw error;
  }
}

export function amountsRoughlyMatch(a: number, b: number, tolerance = AMOUNT_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

export async function createSettlement(input: {
  userId: string;
  transactionIds: string[];
  type: SettlementType;
  label?: string | null;
}) {
  const uniqueIds = [...new Set(input.transactionIds)];
  if (uniqueIds.length < 2) {
    throw new Error('Link at least two transactions');
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: uniqueIds },
      userId: input.userId,
      isDeleted: false,
    },
    include: {
      category: { select: { name: true } },
    },
  });

  if (transactions.length !== uniqueIds.length) {
    throw new Error('One or more transactions were not found');
  }

  try {
    const alreadyLinked = await prisma.transactionSettlementMember.findFirst({
      where: { transactionId: { in: uniqueIds } },
      select: { id: true },
    });
    if (alreadyLinked) {
      throw new Error('One or more transactions are already linked');
    }
  } catch (error) {
    if (isSettlementSchemaMissingError(error)) {
      throw new Error(SETTLEMENT_MIGRATION_HINT);
    }
    throw error;
  }

  const members = transactions.map((tx) => ({
    id: tx.id,
    financialCategory: tx.financialCategory,
    creditAmount: Number(tx.creditAmount) || 0,
    debitAmount: Number(tx.debitAmount) || 0,
    transactionDate: tx.transactionDate,
    description: tx.description,
    personName: tx.personName,
    categoryName: tx.category?.name ?? null,
  }));
  const totalDebits = members.reduce((sum, m) => sum + m.debitAmount, 0);
  const totalCredits = members.reduce((sum, m) => sum + m.creditAmount, 0);

  if (input.type === 'LEND_RETURN' || input.type === 'EXPENSE_REFUND') {
    if (totalDebits <= 0 || totalCredits <= 0) {
      throw new Error('This settlement needs both an outgoing payment and a return credit');
    }
  }

  if (input.type === 'BORROW_REPAY') {
    if (totalCredits <= 0 || totalDebits <= 0) {
      throw new Error('This settlement needs both borrowed money in and a repayment out');
    }
  }

  if (
    (input.type === 'LEND_RETURN' || input.type === 'EXPENSE_REFUND' || input.type === 'BORROW_REPAY')
    && !amountsRoughlyMatch(totalDebits, totalCredits)
    && Math.min(totalDebits, totalCredits) / Math.max(totalDebits, totalCredits) < 0.5
  ) {
    throw new Error('Linked amounts look too far apart — check the transactions');
  }

  try {
    return await prisma.transactionSettlement.create({
      data: {
        userId: input.userId,
        type: input.type,
        label: input.label?.trim() || null,
        members: {
          create: uniqueIds.map((transactionId) => ({ transactionId })),
        },
      },
      include: {
        members: {
          include: {
            transaction: {
              select: {
                id: true,
                description: true,
                creditAmount: true,
                debitAmount: true,
                personName: true,
                transactionDate: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (isSettlementSchemaMissingError(error)) {
      throw new Error(SETTLEMENT_MIGRATION_HINT);
    }
    throw error;
  }
}

export async function deleteSettlement(userId: string, settlementId: string) {
  try {
    const settlement = await prisma.transactionSettlement.findFirst({
      where: { id: settlementId, userId },
    });
    if (!settlement) {
      throw new Error('Settlement not found');
    }
    await prisma.transactionSettlement.delete({ where: { id: settlementId } });
  } catch (error) {
    if (isSettlementSchemaMissingError(error)) {
      throw new Error(SETTLEMENT_MIGRATION_HINT);
    }
    throw error;
  }
}

export async function listSettlements(userId: string, start: Date, end: Date) {
  return loadSettlementLookup(userId, start, end);
}
