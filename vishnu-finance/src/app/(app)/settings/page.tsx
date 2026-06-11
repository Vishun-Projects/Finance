import { Suspense } from 'react';
import SettingsPageClient from './page-client';
import { requireUser } from '@/lib/auth/server-auth';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { loadUserDocuments, loadUserPreferences } from '@/features/settings/loaders';
import { loadUserProfile } from '@/features/settings/loaders-profile';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  const [documents, preferences, profile] = await Promise.all([
    loadUserDocuments({ includePortal: true }),
    loadUserPreferences(user.id),
    loadUserProfile(),
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
        initialProfile={profile}
      />
    </Suspense>
  );
}
