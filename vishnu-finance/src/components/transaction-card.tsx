'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Edit, Trash2, ChevronDown, ChevronUp, Store, User, Tag, Calendar, Receipt } from 'lucide-react';
import { Transaction } from '@/types';
import { getTransactionAmount, formatCurrency, formatTransactionDate } from '@/lib/transaction-utils';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/motion-utils';
import { hapticLight, hapticMedium, hapticError } from '@/lib/haptics';
import { trackSwipeAction } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

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
  currency = 'INR' 
}: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const { user } = useAuth();
  const reducedMotion = prefersReducedMotion();
  const SWIPE_THRESHOLD = 0.4; // 40% of width
  const cardRef = useRef<HTMLDivElement>(null);
  
  const amount = getTransactionAmount(transaction);
  const isCredit = transaction.creditAmount > 0;
  const documentRecord = transaction.document;
  const hasDocument = Boolean(transaction.documentId && documentRecord && !documentRecord.isDeleted);
  const documentDownloadUrl = hasDocument
    ? `/api/user/documents/${transaction.documentId}/download`
    : transaction.receiptUrl || null;
  const documentLabel = hasDocument
    ? documentRecord?.originalName || 'Statement'
    : 'View Receipt';
  const deletedDocumentInfo = documentRecord?.isDeleted
    ? 'Document has been removed by user. Contact an administrator to restore it.'
    : null;
  
  const categoryColor = transaction.category?.color || '#6B7280';
  const categoryName = transaction.category?.name || 'Uncategorized';
  
  const handlers = useSwipeable({
    onSwiping: (e: { deltaX: number }) => {
      if (Math.abs(e.deltaX) > 10) {
        setIsSwiping(true);
        const width = cardRef.current?.offsetWidth || 300;
        const maxOffset = width * 0.4;
        const offset = Math.max(-maxOffset, Math.min(maxOffset, e.deltaX));
        setSwipeOffset(offset);
      }
    },
    onSwipedLeft: () => {
      if (Math.abs(swipeOffset) > (cardRef.current?.offsetWidth || 300) * SWIPE_THRESHOLD) {
        if (onDelete && swipeOffset < 0) {
          hapticError();
          trackSwipeAction('left', 'delete', user?.id);
          onDelete(transaction);
        }
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onSwipedRight: () => {
      if (Math.abs(swipeOffset) > (cardRef.current?.offsetWidth || 300) * SWIPE_THRESHOLD) {
        if (onEdit && swipeOffset > 0) {
          hapticMedium();
          trackSwipeAction('right', 'edit', user?.id);
          onEdit(transaction);
        }
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onSwiped: () => {
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });
  
  // Merge refs
  const mergedRef = (node: HTMLDivElement | null) => {
    cardRef.current = node;
    if (handlers.ref) {
      handlers.ref(node);
    }
  };
  
  return (
    <div 
      ref={mergedRef}
      className="relative overflow-hidden"
      {...Object.fromEntries(Object.entries(handlers).filter(([key]) => key !== 'ref'))}
    >
      {/* Swipe Actions */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
        {onEdit && swipeOffset > 0 && (
          <motion.button
            className="p-2 rounded-full bg-blue-500 text-white"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(transaction);
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            aria-label="Edit transaction"
          >
            <Edit className="w-4 h-4" />
          </motion.button>
        )}
        {onDelete && swipeOffset < 0 && (
          <motion.button
            className="p-2 rounded-full bg-red-500 text-white"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(transaction);
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            aria-label="Delete transaction"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}
      </div>
      
      <motion.div
        className={cn(
          'bg-card rounded-lg border transition-all',
          isCredit ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
        )}
        style={{
          x: reducedMotion ? 0 : swipeOffset,
        }}
        onClick={() => {
          if (!isSwiping) {
            hapticLight();
            setIsExpanded(!isExpanded);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-label={`Transaction: ${transaction.description || 'No description'}, ${formatCurrency(amount, currency)}`}
      >
      {/* Main Card Content - Compact */}
      <div className="p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Icon and Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Category Icon/Color - Smaller */}
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
            >
              {transaction.category?.icon ? (
                <span className="text-base sm:text-lg">{transaction.category.icon}</span>
              ) : (
                <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            
            {/* Transaction Details - Compact */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-xs sm:text-sm truncate">
                {transaction.description || 'No description'}
              </h3>
              
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                {/* Category */}
                <span 
                  className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${categoryColor}20`, 
                    color: categoryColor 
                  }}
                >
                  {categoryName}
                </span>
                
                {/* Store/Person - Compact */}
                {transaction.store && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1 truncate max-w-[120px] sm:max-w-none">
                    <Store className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                    <span className="truncate">{transaction.store}</span>
                  </span>
                )}
                {transaction.personName && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1 truncate max-w-[120px] sm:max-w-none">
                    <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                    <span className="truncate">{transaction.personName}</span>
                  </span>
                )}
                
                {/* Date - Inline with category */}
                <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{formatTransactionDate(transaction.transactionDate)}</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Right: Amount and Actions */}
          <div className="flex flex-col items-end gap-1 sm:gap-2 flex-shrink-0">
            {/* Amount - Compact */}
            <div className={cn(
              'text-base sm:text-lg font-semibold',
              isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {isCredit ? '+' : '-'}{formatCurrency(amount, currency)}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(transaction)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  aria-label="Edit transaction"
                >
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(transaction)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  aria-label="Delete transaction"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Expandable Details - Compact */}
      {isExpanded && (
        <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4 border-t space-y-1.5 sm:space-y-2 pt-2 sm:pt-3">
          {/* Financial Category */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium capitalize">
              {transaction.financialCategory.toLowerCase()}
            </span>
          </div>
          
          {/* UPI ID */}
          {transaction.upiId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">UPI ID</span>
              <span className="font-medium text-xs">{transaction.upiId}</span>
            </div>
          )}
          
          {/* Notes */}
          {transaction.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              <span>{transaction.notes}</span>
            </div>
          )}
          
          {/* Receipt */}
          {documentDownloadUrl && (
            <a
              href={documentDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Receipt className="w-4 h-4" />
              {documentLabel}
            </a>
          )}
          {!documentDownloadUrl && deletedDocumentInfo && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 flex-shrink-0" />
              <span>{deletedDocumentInfo}</span>
            </p>
          )}
          
          {/* Bank Details */}
          {(transaction.bankCode || transaction.accountNumber) && (
            <div className="space-y-1 text-xs text-muted-foreground">
              {transaction.bankCode && (
                <div>Bank: {transaction.bankCode}</div>
              )}
              {transaction.accountNumber && (
                <div>Account: {transaction.accountNumber}</div>
              )}
            </div>
          )}
        </div>
      )}
      
        {/* Expand/Collapse Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full px-4 py-2 border-t flex items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label={isExpanded ? 'Collapse transaction details' : 'Expand transaction details'}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Show More</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
