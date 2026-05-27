/**
 * Account Statement Service
 * 
 * Handles account statement metadata storage and validation,
 * including opening balance tracking and reconciliation.
 */

import { prisma } from './db';

export interface StatementMetadata {
  openingBalance: number | null;
  closingBalance: number | null;
  statementStartDate: string | null;
  statementEndDate: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  branch: string | null;
  accountHolderName: string | null;
  totalDebits: number;
  totalCredits: number;
  transactionCount: number;
  bankCode?: string;
}

export interface AccountStatementRecord {
  id: string;
  userId: string;
  accountNumber: string;
  bankCode: string;
  statementStartDate: Date;
  statementEndDate: Date;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  transactionCount: number;
  importedAt: Date;
  importedBy: string;
  metadata: string | null;
  isActive: boolean;
}

export interface BalanceValidationResult {
  isValid: boolean;
  isFirstImport: boolean;
  lastClosingBalance: number | null;
  discrepancy: number | null;
  warning: string | null;
  error: string | null;
}

/**
 * Get or create account statement record
 */
export async function getOrCreateAccountStatement(
  userId: string,
  accountNumber: string,
  bankCode: string,
  metadata: StatementMetadata
): Promise<AccountStatementRecord | null> {
  if (!metadata.openingBalance || !metadata.statementStartDate || !metadata.statementEndDate) {
    console.warn('Missing required metadata for account statement');
    return null;
  }

  try {
    // Check if statement already exists
    const existing = await (prisma as any).accountStatement.findFirst({
      where: {
        userId,
        accountNumber,
        bankCode,
        statementStartDate: new Date(metadata.statementStartDate),
      },
    });

    if (existing) {
      return existing;
    }

    // Create new statement record
    const statement = await (prisma as any).accountStatement.create({
      data: {
        userId,
        accountNumber,
        bankCode,
        statementStartDate: new Date(metadata.statementStartDate),
        statementEndDate: new Date(metadata.statementEndDate),
        openingBalance: metadata.openingBalance,
        closingBalance: metadata.closingBalance || metadata.openingBalance,
        totalDebits: metadata.totalDebits || 0,
        totalCredits: metadata.totalCredits || 0,
        transactionCount: metadata.transactionCount || 0,
        importedBy: userId,
        metadata: JSON.stringify({
          ifsc: metadata.ifsc,
          branch: metadata.branch,
          accountHolderName: metadata.accountHolderName,
        }),
        isActive: true,
      },
    });

    // Mark other statements for this account as inactive
    await (prisma as any).accountStatement.updateMany({
      where: {
        userId,
        accountNumber,
        bankCode,
        id: { not: statement.id },
      },
      data: {
        isActive: false,
      },
    });

    return statement;
  } catch (error) {
    console.error('Error creating account statement:', error);
    return null;
  }
}

/**
 * Validate opening balance against previous statement
 */
export async function validateOpeningBalance(
  userId: string,
  accountNumber: string,
  bankCode: string,
  newOpeningBalance: number,
  newStatementStartDate?: Date | string | null
): Promise<BalanceValidationResult> {
  const tolerance = 0.01; // Allow ±0.01 for rounding differences
  const warningThreshold = 1.00; // Warn if difference > 1.00

  try {
    const startDate = newStatementStartDate ? new Date(newStatementStartDate) : null;
    const startDateValid = startDate && !Number.isNaN(startDate.getTime());

    // Prefer the statement immediately before this import period
    let lastStatement = startDateValid
      ? await (prisma as any).accountStatement.findFirst({
          where: {
            userId,
            accountNumber,
            bankCode,
            statementEndDate: { lt: startDate },
          },
          orderBy: { statementEndDate: 'desc' },
        })
      : null;

    // Fallback: latest statement for this account (legacy behaviour)
    if (!lastStatement) {
      lastStatement = await (prisma as any).accountStatement.findFirst({
        where: { userId, accountNumber, bankCode },
        orderBy: { statementEndDate: 'desc' },
      });
    }

    // If the latest statement starts on/after the new one, it's an overlap or re-import — skip strict check
    if (
      lastStatement &&
      startDateValid &&
      new Date(lastStatement.statementStartDate).getTime() >= startDate!.getTime()
    ) {
      return {
        isValid: true,
        isFirstImport: false,
        lastClosingBalance: Number(lastStatement.closingBalance),
        discrepancy: null,
        warning:
          'This statement overlaps or precedes an existing import for this account. Opening balance continuity was not enforced.',
        error: null,
      };
    }

    // First import - no validation needed
    if (!lastStatement) {
      return {
        isValid: true,
        isFirstImport: true,
        lastClosingBalance: null,
        discrepancy: null,
        warning: null,
        error: null,
      };
    }

    let lastClosingBalance = Number(lastStatement.closingBalance);
    let gapDays = 0;
    let hasGap = false;

    if (startDateValid) {
      const lastEndDate = new Date(lastStatement.statementEndDate);
      gapDays = Math.ceil((startDate!.getTime() - lastEndDate.getTime()) / (1000 * 60 * 60 * 24));
      hasGap = gapDays > 1;
    }

    // Prefer last known running balance from transactions (more reliable than statement metadata)
    if (startDateValid) {
      const lastTxn = await (prisma as any).transaction.findFirst({
        where: {
          userId,
          accountNumber,
          bankCode,
          isDeleted: false,
          balance: { not: null },
          transactionDate: { lt: startDate },
        },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: { balance: true },
      });

      if (lastTxn?.balance != null) {
        lastClosingBalance = Number(lastTxn.balance);
      }
    }

    const discrepancy = Math.abs(newOpeningBalance - lastClosingBalance);

    // Perfect match or within tolerance
    if (discrepancy <= tolerance) {
      return {
        isValid: true,
        isFirstImport: false,
        lastClosingBalance,
        discrepancy: 0,
        warning: null,
        error: null,
      };
    }

    const mismatchMessage = `Opening balance (${newOpeningBalance}) differs from previous closing balance (${lastClosingBalance}) by ${discrepancy.toFixed(2)}.`;

    // Missing statements between imports — expected mismatch, allow import
    if (hasGap) {
      return {
        isValid: true,
        isFirstImport: false,
        lastClosingBalance,
        discrepancy,
        warning: `${mismatchMessage} There is a ${gapDays}-day gap since the last statement — this is expected if intermediate statements were not imported.`,
        error: null,
      };
    }

    // Small difference - warning but allow
    if (discrepancy < warningThreshold) {
      return {
        isValid: true,
        isFirstImport: false,
        lastClosingBalance,
        discrepancy,
        warning: `${mismatchMessage} This may be due to pending transactions or rounding.`,
        error: null,
      };
    }

    // Large difference with contiguous periods - still allow import but surface as warning, not blocking error
    return {
      isValid: true,
      isFirstImport: false,
      lastClosingBalance,
      discrepancy,
      warning: `${mismatchMessage} Please verify the statement period and account number.`,
      error: null,
    };
  } catch (error) {
    console.error('Error validating opening balance:', error);
    return {
      isValid: true,
      isFirstImport: false,
      lastClosingBalance: null,
      discrepancy: null,
      warning: 'Could not verify opening balance against previous imports. Transactions were still imported.',
      error: null,
    };
  }
}

/**
 * Get latest statement for an account
 */
export async function getLatestStatement(
  userId: string,
  accountNumber: string,
  bankCode: string
): Promise<AccountStatementRecord | null> {
  try {
    return await (prisma as any).accountStatement.findFirst({
      where: {
        userId,
        accountNumber,
        bankCode,
        isActive: true,
      },
      orderBy: {
        statementEndDate: 'desc',
      },
    });
  } catch (error) {
    console.error('Error getting latest statement:', error);
    return null;
  }
}

/**
 * Get account statement history
 */
export async function getAccountHistory(
  userId: string,
  accountNumber: string,
  bankCode: string
): Promise<AccountStatementRecord[]> {
  try {
    return await (prisma as any).accountStatement.findMany({
      where: {
        userId,
        accountNumber,
        bankCode,
      },
      orderBy: {
        statementStartDate: 'asc',
      },
    });
  } catch (error) {
    console.error('Error getting account history:', error);
    return [];
  }
}

/**
 * Check for gaps between statements
 */
export async function checkStatementContinuity(
  userId: string,
  accountNumber: string,
  bankCode: string,
  newStatementStartDate: Date
): Promise<{ hasGap: boolean; gapDays: number; lastEndDate: Date | null }> {
  try {
    const lastStatement = await (prisma as any).accountStatement.findFirst({
      where: {
        userId,
        accountNumber,
        bankCode,
      },
      orderBy: {
        statementEndDate: 'desc',
      },
    });

    if (!lastStatement) {
      return { hasGap: false, gapDays: 0, lastEndDate: null };
    }

    const lastEndDate = new Date(lastStatement.statementEndDate);
    const gapTime = newStatementStartDate.getTime() - lastEndDate.getTime();
    const gapDays = Math.ceil(gapTime / (1000 * 60 * 60 * 24));

    // Allow 1 day gap for statement processing delays
    const hasGap = gapDays > 1;

    return { hasGap, gapDays, lastEndDate };
  } catch (error) {
    console.error('Error checking statement continuity:', error);
    return { hasGap: false, gapDays: 0, lastEndDate: null };
  }
}

