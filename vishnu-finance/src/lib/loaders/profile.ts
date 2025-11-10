
import { serverFetch } from '@/lib/server-fetch';

export interface UserProfilePayload {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  occupation?: string | null;
  bio?: string | null;
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  role?: 'USER' | 'SUPERUSER';
  status?: 'ACTIVE' | 'FROZEN' | 'SUSPENDED' | null;
}

interface UserProfileResponse {
  user: UserProfilePayload;
}

export async function loadUserProfile(): Promise<UserProfilePayload | null> {
  const data = await serverFetch<UserProfileResponse>('/api/user/profile', {
    cache: 'no-store',
    description: 'user-profile',
    revalidate: 30,
  });

  return data?.user ?? null;
}
