import { Suspense } from 'react';
import SettingsPageClient from './page-client';
import { requireUser } from '@/lib/auth/server-auth';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { loadUserDocuments, loadUserPreferences } from '@/features/settings/loaders';
import { loadUserProfile } from '@/features/settings/loaders-profile';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <Suspense fallback={<AppRouteLoader variant="generic" title="Loading settings" />}>
      <SettingsLoader />
    </Suspense>
  );
}

async function SettingsLoader() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  const [documents, preferences, profile] = await Promise.all([
    loadUserDocuments({ includePortal: true }),
    loadUserPreferences(user.id),
    loadUserProfile(),
  ]);

  return (
    <SettingsPageClient
      initialDocuments={documents}
      initialPreferences={preferences}
      initialProfile={profile}
    />
  );
}
