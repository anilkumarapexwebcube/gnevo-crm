'use client';

import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** A name/title link to a detail page, with a "view details" hover tooltip. */
export function DetailLink({
  href,
  tip = 'View details',
  className = 'font-medium hover:text-primary hover:underline',
  children,
}: {
  href: string;
  tip?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link href={href} className={className}>
            {children}
          </Link>
        }
      />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
