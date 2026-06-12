import { Suspense } from 'react';
import SettingsPageClient from './page-client';
import { requireUser } from '@/lib/auth/server-auth';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { loadUserDocuments, loadUserPreferences } from '@/features/settings/loaders-settings';
import { loadUserProfile } from '@/features/settings/loaders-profile';
import type { UserDocumentSummary } from '@/types/documents';
import type { UserPreferencesPayload } from '@/features/settings/types';
import type { UserProfilePayload } from '@/features/settings/loaders-profile';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFERENCES: UserPreferencesPayload = {
  navigationLayout: 'sidebar',
  theme: 'system',
  colorScheme: 'default',
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<AppRouteLoader variant="settings" title="Loading settings" />}>
      <SettingsLoader />
    </Suspense>
  );
}

async function SettingsLoader() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  let documents: UserDocumentSummary[] = [];
  let preferences: UserPreferencesPayload = DEFAULT_PREFERENCES;
  let profile: UserProfilePayload | null = null;

  try {
    const [docs, prefs, prof] = await Promise.all([
      loadUserDocuments({ userId: user.id, includePortal: true }),
      loadUserPreferences(user.id),
      loadUserProfile(),
    ]);
    documents = docs;
    if (prefs) preferences = prefs;
    profile = prof;
  } catch (error) {
    console.error('[settings-page] bootstrap failed', { userId: user.id, error });
  }

  return (
    <SettingsPageClient
      initialDocuments={documents}
      initialPreferences={preferences}
      initialProfile={profile}
    />
  );
}
