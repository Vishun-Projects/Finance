import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/server-auth';

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

export async function loadUserProfile(): Promise<UserProfilePayload | null> {
  const user = await requireUser();
  const userProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      gender: true,
      phone: true,
      dateOfBirth: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      country: true,
      pincode: true,
      occupation: true,
      bio: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      role: true,
      status: true,
    },
  });

  if (!userProfile) return null;

  return {
    ...userProfile,
    dateOfBirth: userProfile.dateOfBirth?.toISOString() ?? null,
    lastLogin: userProfile.lastLogin?.toISOString() ?? null,
    createdAt: userProfile.createdAt.toISOString(),
    updatedAt: userProfile.updatedAt.toISOString(),
  };
}
