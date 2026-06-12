import { getCurrentUser } from '@/lib/auth/server-auth';
import { getSuperuserEmail } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminClientLayout } from '@/features/admin/components/admin-layout';
import { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const superEmail = getSuperuserEmail();
  const isSuperAdmin = user?.email === superEmail || user?.role === 'SUPERUSER';

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  return (
    <AdminClientLayout>
      {children}
    </AdminClientLayout>
  );
}
