"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Store,
  User,
  Tag,
  Calendar,
  Receipt,
} from "lucide-react";
import { Transaction } from "@/types";
import {
  getTransactionAmount,
  formatCurrency,
  formatTransactionDate,
} from "@/lib/transaction-utils";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion-utils";
import { hapticLight, hapticMedium, hapticError } from "@/lib/haptics";

interface TransactionCardProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  currency?: string;
}

export default function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  currency = "INR",
}: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const reducedMotion = prefersReducedMotion();

  const amount = getTransactionAmount(transaction);
  const isCredit = transaction.creditAmount > 0;
  const documentRecord = transaction.document;
  const hasDocument = Boolean(
    transaction.documentId && documentRecord && !documentRecord.isDeleted,
  );
  const documentDownloadUrl = hasDocument
    ? `/api/user/documents/${transaction.documentId}/download`
    : transaction.receiptUrl || null;
  const documentLabel = hasDocument
    ? documentRecord?.originalName || "Statement"
    : "View Receipt";
  const deletedDocumentInfo = documentRecord?.isDeleted
    ? "Document has been removed by user. Contact an administrator to restore it."
    : null;

  const categoryColor = transaction.category?.color || "#6B7280";
  const categoryName = transaction.category?.name || "Uncategorised";

  const toggleExpanded = () => {
    hapticLight();
    setIsExpanded((prev) => !prev);
  };

  const handleEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!onEdit) return;
    hapticMedium();
    onEdit(transaction);
  };

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!onDelete) return;
    hapticError();
    onDelete(transaction);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleExpanded();
    }
  };

  return (
    <motion.div
      className={cn(
        "w-full cursor-pointer overflow-hidden rounded-2xl border bg-card shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isCredit ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500",
      )}
      whileHover={reducedMotion ? undefined : { translateY: -2 }}
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`Transaction: ${transaction.description || "No description"}, ${formatCurrency(amount, currency)}`}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Icon + primary details */}
          <div className="flex flex-1 items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                backgroundColor: `${categoryColor}1a`,
                color: categoryColor,
              }}
            >
              {transaction.category?.icon ? (
                <span className="text-lg">{transaction.category.icon}</span>
              ) : (
                <Tag className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium sm:text-base">
                {transaction.description || "No description"}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${categoryColor}14`,
                    color: categoryColor,
                  }}
                >
                  {categoryName}
                </span>

                {transaction.store && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Store className="h-3 w-3" />
                    <span className="max-w-[120px] truncate sm:max-w-none">
                      {transaction.store}
                    </span>
                  </span>
                )}

                {transaction.personName && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="max-w-[120px] truncate sm:max-w-none">
                      {transaction.personName}
                    </span>
                  </span>
                )}

                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatTransactionDate(transaction.transactionDate)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Amount + quick controls */}
          <div className="flex flex-col items-end gap-2">
            <div
              className={cn(
                "text-base font-semibold sm:text-lg",
                isCredit
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {isCredit ? "+" : "-"}
              {formatCurrency(amount, currency)}
            </div>

            <div className="flex items-center gap-1.5">
              {onEdit && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Edit transaction"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-full p-2 text-destructive transition-colors hover:bg-destructive/90"
                  aria-label="Delete transaction"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2 border-t px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium capitalize">
              {transaction.financialCategory.toLowerCase()}
            </span>
          </div>

          {transaction.upiId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">UPI ID</span>
              <span className="truncate text-xs font-medium">
                {transaction.upiId}
              </span>
            </div>
          )}

          {transaction.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              <span>{transaction.notes}</span>
            </div>
          )}

          {documentDownloadUrl && (
            <a
              href={documentDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary transition-colors hover:underline"
            >
              <Receipt className="h-4 w-4" />
              {documentLabel}
            </a>
          )}

          {!documentDownloadUrl && deletedDocumentInfo && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Receipt className="h-4 w-4 flex-shrink-0" />
              <span>{deletedDocumentInfo}</span>
            </p>
          )}

          {(transaction.bankCode || transaction.accountNumber) && (
            <div className="space-y-1 text-xs text-muted-foreground">
              {transaction.bankCode && <div>Bank: {transaction.bankCode}</div>}
              {transaction.accountNumber && (
                <div>Account: {transaction.accountNumber}</div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toggleExpanded();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-b-2xl border-t px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={
          isExpanded
            ? "Collapse transaction details"
            : "Expand transaction details"
        }
      >
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        <span>{isExpanded ? "Show less" : "Show more"}</span>
      </button>
    </motion.div>
  );
}
