import type { AuthenticatedUser } from '@/lib/api-auth';
import { forbiddenResponse } from '@/lib/api-auth';

/** Reject when client supplies a userId that does not match the session user. */
export function rejectForeignUserId(
  user: AuthenticatedUser,
  requestedUserId?: string | null,
) {
  if (!requestedUserId || requestedUserId === user.id) return null;
  if (user.role === 'SUPERUSER') return null;
  return forbiddenResponse('Cannot access another user\'s data');
}

export function sessionUserId(user: AuthenticatedUser, requestedUserId?: string | null): string {
  return user.id;
}
