import { requireUser } from '@/lib/auth/server-auth';
import { computeNetWorth, EMPTY_NET_WORTH } from '@/lib/net-worth-service';
import NetWorthPage from '@/features/net-worth/components/net-worth-page';

export default async function NetWorthRoutePage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  let initialData = EMPTY_NET_WORTH;
  try {
    initialData = await computeNetWorth(user.id);
  } catch (error) {
    console.error('[net-worth-page] bootstrap failed', { userId: user.id, error });
  }

  return <NetWorthPage initialData={initialData} />;
}
