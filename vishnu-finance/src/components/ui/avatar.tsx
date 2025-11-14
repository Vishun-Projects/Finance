'use client';

import React from 'react';
import Image from 'next/image';
import { getAvatarUrl, getDummyAvatarUrl } from '@/lib/avatar-utils';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function Avatar({ 
  src, 
  alt = 'User avatar', 
  userId, 
  size = 'md',
  className 
}: AvatarProps) {
  const avatarUrl = getAvatarUrl(src, userId);
  const sizeClass = sizeClasses[size];
  const isExternalUrl = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://');

  return (
    <div className={cn('relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center', sizeClass, className)}>
      {isExternalUrl ? (
        // Use regular img tag for external URLs (Google OAuth, etc.) for better compatibility
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to dummy avatar if external image fails to load
            const target = e.target as HTMLImageElement;
            target.src = getDummyAvatarUrl(userId);
          }}
        />
      ) : (
        // Use Next.js Image for local avatars (better optimization)
        <Image
          src={avatarUrl}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 40px, 64px"
        />
      )}
    </div>
  );
}

interface AvatarWithFallbackProps extends AvatarProps {
  fallback?: React.ReactNode;
}

export function AvatarWithFallback({ 
  fallback,
  ...props 
}: AvatarWithFallbackProps) {
  if (!props.src && fallback) {
    return (
      <div className={cn(
        'rounded-full bg-gray-200 flex items-center justify-center',
        sizeClasses[props.size || 'md'],
        props.className
      )}>
        {fallback}
      </div>
    );
  }

  return <Avatar {...props} />;
}

