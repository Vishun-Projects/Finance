import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import AuthPageClient from './auth-page-client';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { getCurrentUser } from '@/lib/auth/server-auth';

interface AuthPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = 'force-dynamic';

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const user = await getCurrentUser();

  if (user) {
    const destination = user.role === 'SUPERUSER' ? '/admin' : '/dashboard';
    redirect(destination);
  }

  const initialTabParam = Array.isArray(searchParams?.tab)
    ? searchParams?.tab[0]
    : searchParams?.tab;
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


