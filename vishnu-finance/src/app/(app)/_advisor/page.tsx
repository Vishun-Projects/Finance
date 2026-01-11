import { requireUser } from '@/lib/auth/server-auth';
import AdvisorPageClient from './page-client';

export default async function AdvisorPage() {
  await requireUser({ redirectTo: '/auth?tab=login' });

  return <AdvisorPageClient />;
}

