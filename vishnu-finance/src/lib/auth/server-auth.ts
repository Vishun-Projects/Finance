import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthService } from '@/lib/auth';

const AUTH_COOKIE = 'auth-token';

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      return null;
    }

    if (user.isActive === false) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('[server-auth] Failed to read current user', error);
    return null;
  }
});

interface RequireUserOptions {
  redirectTo?: string;
  allowInactive?: boolean;
}

export async function requireUser(options: RequireUserOptions = {}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(options.redirectTo ?? '/auth?tab=login');
  }

  if (!options.allowInactive && user.isActive === false) {
    redirect(options.redirectTo ?? '/auth?tab=login');
  }

  return user;
}

interface RequireRoleOptions extends RequireUserOptions {
  redirectOnRoleMismatch?: string;
}

export async function requireSuperuser(options: RequireRoleOptions = {}) {
  const user = await requireUser(options);
  if (user.role !== 'SUPERUSER') {
    redirect(options.redirectOnRoleMismatch ?? '/dashboard');
  }
  return user;
}


