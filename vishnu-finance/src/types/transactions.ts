
export interface ManagedTransaction {
  id: string;
  type?: 'credit' | 'debit' | 'expense' | 'income';
  description: string;
  transactionDate?: string | null;
  creditAmount?: number | null;
  debitAmount?: number | null;
  financialCategory?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER' | null;
  category?: string | null;
  bankCode?: string | null;
  store?: string | null;
  rawData?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ManageTransactionsResponse {
  transactions: ManagedTransaction[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
