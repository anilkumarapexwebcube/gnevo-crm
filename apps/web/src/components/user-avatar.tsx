'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A user's uploaded avatar, falling back to a clean default user icon.
 * Pass `hasAvatar={false}` to skip the network request entirely.
 */
export function UserAvatar({
  userId,
  name,
  hasAvatar = true,
  className,
  iconClassName,
  bust,
}: {
  userId: string;
  name?: string;
  hasAvatar?: boolean;
  className?: string;
  iconClassName?: string;
  bust?: number;
}) {
  const [failed, setFailed] = useState(false);
  // Reset the error state when the source changes (e.g. after a new upload).
  useEffect(() => setFailed(false), [userId, bust, hasAvatar]);

  const showImg = !!(hasAvatar && !failed && userId);

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-br from-primary to-primary/70 text-primary-foreground',
        className,
      )}
    >
      {showImg ? (
        <img
          src={`/api/users/${userId}/avatar${bust ? `?v=${bust}` : ''}`}
          alt={name ?? ''}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <User className={cn('size-1/2', iconClassName)} strokeWidth={2.25} />
      )}
    </span>
  );
}
