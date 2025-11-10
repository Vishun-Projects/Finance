
import { Suspense } from 'react';
import ProfileSettingsSection from '@/components/settings/profile-section';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { requireUser } from '@/lib/auth/server-auth';
import { loadUserProfile } from '@/lib/loaders/profile';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  let profile = null;
  try {
    profile = await loadUserProfile();
  } catch (error) {
    console.error('[profile] failed to bootstrap profile', error);
  }

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Loading your profile"
          description="Fetching your latest account details…"
          className="min-h-[40vh]"
        />
      }
    >
      <ProfileSettingsSection mode="standalone" initialProfile={profile ?? user} />
    </Suspense>
  );
}
