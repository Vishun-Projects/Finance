import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { AdminClientLayout } from '@/components/admin/admin-client-layout';
import { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.email === 'vishnu@finance' || user?.role === 'SUPERUSER';

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  return (
    <AdminClientLayout>
      {children}
    </AdminClientLayout>
  );
}
