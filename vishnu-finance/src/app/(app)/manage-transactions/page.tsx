'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TransactionManagementTable from '@/components/transaction-management-table';

export default function ManageTransactionsPage() {

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Manage Transactions</h1>
        <p className="text-muted-foreground mt-2">
          View, select, and delete transactions. Deleted transactions can be reimported.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Management</CardTitle>
          <CardDescription>
            Use this page to delete transactions for testing and reimporting bank statements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionManagementTable />
        </CardContent>
      </Card>
    </div>
  );
}

