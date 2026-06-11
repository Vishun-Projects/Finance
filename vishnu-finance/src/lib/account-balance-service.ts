import { prisma } from '@/lib/db';

export type AccountBalanceSource = 'last_txn_balance' | 'statement_closing' | 'fallback_txn';

export interface CurrentAccountBalance {
  amount: number | null;
  asOfDate: string | null;
  importedAt: string | null;
  source: AccountBalanceSource | null;
  accountNumber: string | null;
  bankCode: string | null;
  statementId: string | null;
  warning: string | null;
}

function parseBalance(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface BalanceResolutionInput {
  txnBalance: number | null;
  txnDate: Date | null;
  closingBalance: number | null;
  statementEndDate: Date | null;
  importedAt: Date | null;
  accountNumber: string | null;
  bankCode: string | null;
  statementId: string | null;
}

/**
 * Pure priority resolver for unit tests and service logic.
 * Prefers last txn balance, then statement closing, else null.
 */
export function resolveBalanceFromStatement(input: BalanceResolutionInput): CurrentAccountBalance {
  if (input.txnBalance != null && input.txnDate) {
    return {
      amount: input.txnBalance,
      asOfDate: input.txnDate.toISOString(),
      importedAt: input.importedAt?.toISOString() ?? null,
      source: 'last_txn_balance',
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
      statementId: input.statementId,
      warning: null,
    };
  }

  if (input.closingBalance != null && input.statementEndDate) {
    return {
      amount: input.closingBalance,
      asOfDate: input.statementEndDate.toISOString(),
      importedAt: input.importedAt?.toISOString() ?? null,
      source: 'statement_closing',
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
      statementId: input.statementId,
      warning: null,
    };
  }

  return {
    amount: null,
    asOfDate: null,
    importedAt: input.importedAt?.toISOString() ?? null,
    source: null,
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
    statementId: input.statementId,
    warning: null,
  };
}

async function lastTxnBalanceInRange(
  userId: string,
  accountNumber: string | null,
  bankCode: string | null,
  endDate: Date,
): Promise<{ balance: number; date: Date } | null> {
  const where: Record<string, unknown> = {
    userId,
    isDeleted: false,
    balance: { not: null },
    transactionDate: { lte: endDate },
  };
  if (accountNumber) where.accountNumber = accountNumber;
  if (bankCode) where.bankCode = bankCode;

  const txn = await prisma.transaction.findFirst({
    where: where as any,
    orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    select: { balance: true, transactionDate: true },
  });

  if (txn?.balance == null) return null;
  const balance = parseBalance(txn.balance);
  if (balance == null) return null;
  return { balance, date: txn.transactionDate };
}

/**
 * Resolve current bank balance from the most recently uploaded PDF statement.
 */
export async function getCurrentAccountBalance(userId: string): Promise<CurrentAccountBalance> {
  const empty: CurrentAccountBalance = {
    amount: null,
    asOfDate: null,
    importedAt: null,
    source: null,
    accountNumber: null,
    bankCode: null,
    statementId: null,
    warning: null,
  };

  try {
    const latestStatement = await (prisma as any).accountStatement.findFirst({
      where: { userId, isActive: true },
      orderBy: { importedAt: 'desc' },
    });

    if (latestStatement) {
      const accountNumber = latestStatement.accountNumber as string;
      const bankCode = latestStatement.bankCode as string;
      const endDate = new Date(latestStatement.statementEndDate);
      const txnResult = await lastTxnBalanceInRange(userId, accountNumber, bankCode, endDate);
      const resolved = resolveBalanceFromStatement({
        txnBalance: txnResult?.balance ?? null,
        txnDate: txnResult?.date ?? null,
        closingBalance: parseBalance(latestStatement.closingBalance),
        statementEndDate: endDate,
        importedAt: latestStatement.importedAt,
        accountNumber,
        bankCode,
        statementId: latestStatement.id,
      });
      if (resolved.amount != null) {
        return resolved;
      }
    }

    const fallbackTxn = await prisma.transaction.findFirst({
      where: {
        userId,
        isDeleted: false,
        balance: { not: null },
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        balance: true,
        transactionDate: true,
        accountNumber: true,
        bankCode: true,
      },
    });

    if (fallbackTxn?.balance != null) {
      const balance = parseBalance(fallbackTxn.balance);
      if (balance != null) {
        return {
          amount: balance,
          asOfDate: fallbackTxn.transactionDate.toISOString(),
          importedAt: null,
          source: 'fallback_txn',
          accountNumber: fallbackTxn.accountNumber,
          bankCode: fallbackTxn.bankCode,
          statementId: null,
          warning: 'No statement record found — balance from latest transaction with running balance.',
        };
      }
    }

    return empty;
  } catch (error) {
    console.error('[account-balance-service]', error);
    return { ...empty, warning: 'Could not load bank balance.' };
  }
}
