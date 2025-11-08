'use client';

import { Suspense } from 'react';
import TransactionUnifiedManagement from '@/components/transaction-unified-management';

function TransactionsContent() {
  return <TransactionUnifiedManagement />;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
