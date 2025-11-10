import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    const destination = user.role === 'SUPERUSER' ? '/admin' : '/dashboard';
    redirect(destination);
  }

  redirect('/auth?tab=login');
}
