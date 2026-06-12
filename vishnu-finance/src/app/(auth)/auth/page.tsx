import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import AuthPageClient from './page-client';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { getCurrentUser } from '@/lib/auth/server-auth';

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const resolvedSearchParams = await searchParams;
  const signedOutParam = resolvedSearchParams?.signedOut;
  const signedOut = signedOutParam === '1' || (Array.isArray(signedOutParam) && signedOutParam[0] === '1');

  if (!signedOut) {
    const user = await getCurrentUser();
    if (user) {
      const destination = user.role === 'SUPERUSER' ? '/admin' : '/dashboard';
      redirect(destination);
    }
  }

  const initialTabParam = Array.isArray(resolvedSearchParams?.tab)
    ? resolvedSearchParams.tab[0]
    : resolvedSearchParams?.tab;
  const initialTab = initialTabParam === 'register' ? 'register' : 'login';

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Preparing authentication portal"
          description="Loading secure login experience…"
        />
      }
    >
      <AuthPageClient initialTab={initialTab} />
    </Suspense>
  );
}


