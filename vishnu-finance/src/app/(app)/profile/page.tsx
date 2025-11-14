
import { Suspense } from 'react';
import ProfileSettingsSection from '@/components/settings/profile-section';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { requireUser } from '@/lib/auth/server-auth';
import { loadUserProfile } from '@/lib/loaders/profile';
import type { User } from '@/contexts/AuthContext';

export const dynamic = 'force-dynamic';

function normalizeProfile(input: unknown): Partial<User> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const value = input as Record<string, unknown>;
  const dateToString = (maybeDate: unknown): string | undefined => {
    if (maybeDate instanceof Date) return maybeDate.toISOString();
    if (typeof maybeDate === 'string') return maybeDate;
    return undefined;
  };

  return {
    id: typeof value.id === 'string' ? value.id : undefined,
    email: typeof value.email === 'string' ? value.email : undefined,
    name: typeof value.name === 'string' ? value.name : undefined,
    avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : undefined,
    gender: typeof value.gender === 'string' ? (value.gender as User['gender']) : undefined,
    phone: typeof value.phone === 'string' ? value.phone : undefined,
    dateOfBirth: dateToString(value.dateOfBirth),
    addressLine1: typeof value.addressLine1 === 'string' ? value.addressLine1 : undefined,
    addressLine2: typeof value.addressLine2 === 'string' ? value.addressLine2 : undefined,
    city: typeof value.city === 'string' ? value.city : undefined,
    state: typeof value.state === 'string' ? value.state : undefined,
    country: typeof value.country === 'string' ? value.country : undefined,
    pincode: typeof value.pincode === 'string' ? value.pincode : undefined,
    occupation: typeof value.occupation === 'string' ? value.occupation : undefined,
    bio: typeof value.bio === 'string' ? value.bio : undefined,
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    lastLogin: dateToString(value.lastLogin),
    createdAt: dateToString(value.createdAt) ?? new Date().toISOString(),
    updatedAt: dateToString(value.updatedAt),
    role: typeof value.role === 'string' ? (value.role as User['role']) : undefined,
  };
}

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
      <ProfileSettingsSection
        mode="standalone"
        initialProfile={normalizeProfile(profile ?? user)}
      />
    </Suspense>
  );
}
