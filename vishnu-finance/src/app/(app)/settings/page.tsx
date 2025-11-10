import { Suspense } from 'react';
import SettingsPageClient from './page-client';
import { requireUser } from '@/lib/auth/server-auth';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { loadUserDocuments, loadUserPreferences } from '@/lib/loaders/settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  const [documents, preferences] = await Promise.all([
    loadUserDocuments({ includePortal: true }),
    loadUserPreferences(user.id),
  ]);

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Loading settings"
          description="Preparing your account preferences…"
          className="min-h-[40vh]"
        />
      }
    >
      <SettingsPageClient
        initialDocuments={documents}
        initialPreferences={preferences}
      />
    </Suspense>
  );
}
