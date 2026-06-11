'use client';

import { Mail } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function SettingsProfileHeader({
  name,
  email,
  avatarUrl,
  memberSince,
  avatarSlot,
  className,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  memberSince?: string;
  avatarSlot?: React.ReactNode;
  className?: string;
}) {
  const { user } = useAuth();
  const displayName = name || user?.name || 'User';
  const displayEmail = email || user?.email || '';

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-4 py-5 text-center lg:flex-row lg:items-start lg:gap-4 lg:px-1 lg:py-2 lg:text-left',
        className
      )}
    >
      <div className="relative shrink-0">
        {avatarSlot ?? (
          <Avatar userId={user?.id || 'guest'} src={avatarUrl ?? user?.avatarUrl} size="xl" />
        )}
      </div>
      <div className="min-w-0 flex-1 lg:pt-1">
        <h2 className="truncate text-lg font-semibold text-foreground">{displayName}</h2>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <Mail className="size-3.5 shrink-0" />
          {displayEmail}
        </p>
        {memberSince && <p className="mt-1 text-xs text-hint">Member since {memberSince}</p>}
      </div>
    </div>
  );
}
