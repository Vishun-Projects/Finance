import { Suspense } from 'react';
import { Metadata } from 'next';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { requireUser } from '@/lib/auth/server-auth';
import { loadSalaryBootstrap } from '@/features/salary/loaders';
import SalaryManagement from '@/features/salary/components/salary-management';

export const metadata: Metadata = {
  title: 'Salary Structure | Vishnu Finance',
  description: 'Manage your salary structure and history',
};

export default function SalaryPage() {
  return (
    <Suspense fallback={<AppRouteLoader variant="generic" title="Loading salary" />}>
      <SalaryPageLoader />
    </Suspense>
  );
}

async function SalaryPageLoader() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const bootstrap = await loadSalaryBootstrap(user.id);
  return <SalaryManagement initialBootstrap={bootstrap} />;
}
