import { StatementMetadata } from './account-statement';

export interface BalanceValidationResult {
  isValid: boolean;
  calculatedClosingBalance: number;
  expectedClosingBalance: number | null;
  discrepancy: number;
  errors: string[];
  warnings: string[];
  accountNumberValid: boolean;
  accountNumberIssues: string[];
}

/**
 * Validate balance reconciliation: openingBalance + credits - debits = closingBalance
 */
export function validateBalanceReconciliation(
  metadata: StatementMetadata,
  transactions: Array<{
    creditAmount: number;
    debitAmount: number;
    balance?: number | null;
  }>
): BalanceValidationResult {
  const result: BalanceValidationResult = {
    isValid: true,
    calculatedClosingBalance: 0,
    expectedClosingBalance: metadata.closingBalance || null,
    discrepancy: 0,
    errors: [],
    warnings: [],
    accountNumberValid: true,
    accountNumberIssues: [],
  };

  // Validate account number extraction (warning only, doesn't fail validation)
  if (!metadata.accountNumber || metadata.accountNumber.trim() === '') {
    result.accountNumberValid = false;
    result.accountNumberIssues.push('Account number not extracted from PDF');
    result.warnings.push('Account number could not be extracted from statement');
    // Don't set isValid = false just because account number is missing
  }

  // Validate opening balance exists
  if (metadata.openingBalance === null || metadata.openingBalance === undefined) {
    result.isValid = false;
    result.errors.push('Opening balance not found in statement metadata');
    return result;
  }

  // Calculate total credits and debits from transactions
  // IMPORTANT: Include ALL transactions, regardless of financialCategory
  const totalCredits = transactions.reduce(
    (sum, t) => sum + (Number(t.creditAmount) || 0),
    0
  );
  const totalDebits = transactions.reduce(
    (sum, t) => sum + (Number(t.debitAmount) || 0),
    0
  );
  
  // Log for debugging balance discrepancies
  console.log(`📊 Balance validation: ${transactions.length} transactions, Credits: ₹${totalCredits.toFixed(2)}, Debits: ₹${totalDebits.toFixed(2)}`);

  // Calculate expected closing balance
  const calculatedClosing =
    metadata.openingBalance + totalCredits - totalDebits;
  result.calculatedClosingBalance = calculatedClosing;

  // Compare with metadata totals if available
  if (metadata.totalCredits !== undefined && metadata.totalDebits !== undefined) {
    const metadataTotalCredits = Number(metadata.totalCredits) || 0;
    const metadataTotalDebits = Number(metadata.totalDebits) || 0;

    // Check if transaction totals match metadata totals
    const creditsDiff = Math.abs(totalCredits - metadataTotalCredits);
    const debitsDiff = Math.abs(totalDebits - metadataTotalDebits);

    if (creditsDiff > 0.01) {
      result.warnings.push(
        `Total credits mismatch: transactions sum to ₹${totalCredits.toFixed(
          2
        )}, metadata shows ₹${metadataTotalCredits.toFixed(2)} (difference: ₹${creditsDiff.toFixed(2)})`
      );
    }

    if (debitsDiff > 0.01) {
      result.warnings.push(
        `Total debits mismatch: transactions sum to ₹${totalDebits.toFixed(
          2
        )}, metadata shows ₹${metadataTotalDebits.toFixed(2)} (difference: ₹${debitsDiff.toFixed(2)})`
      );
    }
  }

  // Validate closing balance if available
  if (metadata.closingBalance !== null && metadata.closingBalance !== undefined) {
    result.expectedClosingBalance = metadata.closingBalance;
    const discrepancy = Math.abs(
      calculatedClosing - metadata.closingBalance
    );
    result.discrepancy = discrepancy;

    // Tolerance for rounding differences
    const tolerance = 0.01; // 1 paisa

    if (discrepancy > tolerance) {
      if (discrepancy > 1.0) {
        // Large discrepancy - error
        result.isValid = false;
        result.errors.push(
          `Balance reconciliation failed: Opening balance (₹${metadata.openingBalance.toFixed(
            2
          )}) + Credits (₹${totalCredits.toFixed(
            2
          )}) - Debits (₹${totalDebits.toFixed(
            2
          )}) = ₹${calculatedClosing.toFixed(
            2
          )}, but statement shows closing balance of ₹${metadata.closingBalance.toFixed(
            2
          )} (difference: ₹${discrepancy.toFixed(2)})`
        );
      } else {
        // Small discrepancy - warning (likely rounding), but don't fail validation
        result.warnings.push(
          `Minor balance discrepancy: ₹${discrepancy.toFixed(
            2
          )} (likely due to rounding)`
        );
        // Don't set isValid = false for minor discrepancies
      }
    } else {
      // Balance matches perfectly or within tolerance - validation passed
      result.warnings.push('✅ Balance reconciliation successful');
      // isValid remains true (already set at start)
    }
  } else {
    // No closing balance in metadata, use calculated value
    result.warnings.push(
      'Closing balance not found in statement metadata, using calculated value'
    );
    result.expectedClosingBalance = calculatedClosing;
    result.discrepancy = 0; // No discrepancy to calculate if no closing balance
    // isValid remains true (can't validate without closing balance, but not an error)
  }
  
  // Only fail validation if there are actual balance errors (large discrepancies or missing opening balance)
  // Account number missing is a warning only, not an error

  // Validate transaction balance continuity
  if (transactions.length > 0) {
    let prevBalance: number | null = null;
    let balanceIssues = 0;

    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      const currentBalance = txn.balance;

      if (currentBalance !== null && currentBalance !== undefined) {
        if (prevBalance !== null) {
          const expectedBalance =
            prevBalance +
            (Number(txn.creditAmount) || 0) -
            (Number(txn.debitAmount) || 0);
          const diff = Math.abs(currentBalance - expectedBalance);

          if (diff > 0.01) {
            balanceIssues++;
          }
        } else if (i === 0) {
          // First transaction should match opening balance + first transaction
          const expectedFirstBalance =
            metadata.openingBalance +
            (Number(txn.creditAmount) || 0) -
            (Number(txn.debitAmount) || 0);
          const diff = Math.abs(currentBalance - expectedFirstBalance);

          if (diff > 0.01) {
            balanceIssues++;
          }
        }

        prevBalance = currentBalance;
      }
    }

    if (balanceIssues > 0) {
      result.warnings.push(
        `${balanceIssues} transaction(s) have balance continuity issues`
      );
    }
  }

  return result;
}

/**
 * Format validation result as human-readable message
 */
export function formatValidationResult(
  result: BalanceValidationResult
): string {
  const lines: string[] = [];

  if (result.isValid && result.errors.length === 0) {
    lines.push('✅ Balance validation passed');
  } else {
    lines.push('❌ Balance validation failed');
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach((error) => lines.push(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach((warning) => lines.push(`  ⚠️  ${warning}`));
  }

  if (result.accountNumberIssues.length > 0) {
    lines.push('\nAccount Number Issues:');
    result.accountNumberIssues.forEach((issue) => lines.push(`  ⚠️  ${issue}`));
  }

  lines.push(
    `\nCalculated Closing Balance: ₹${result.calculatedClosingBalance.toFixed(2)}`
  );
  if (result.expectedClosingBalance !== null) {
    lines.push(
      `Expected Closing Balance: ₹${result.expectedClosingBalance.toFixed(2)}`
    );
    if (result.discrepancy > 0.01) {
      lines.push(`Discrepancy: ₹${result.discrepancy.toFixed(2)}`);
    }
  }

  return lines.join('\n');
}

