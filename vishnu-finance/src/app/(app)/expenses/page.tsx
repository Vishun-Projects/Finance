'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExpensesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/transactions?type=EXPENSE');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to Transactions...</p>
    </div>
  );
}
