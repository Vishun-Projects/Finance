
'use client';

import TransactionUnifiedManagement, { TransactionsBootstrap } from '@/components/transaction-unified-management';

interface TransactionsPageClientProps {
  bootstrap?: TransactionsBootstrap;
}

export default function TransactionsPageClient({ bootstrap }: TransactionsPageClientProps) {
  return <TransactionUnifiedManagement bootstrap={bootstrap} />;
}
