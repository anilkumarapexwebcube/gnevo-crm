import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Instant skeleton shown the moment any app page is navigated to (route-group
 * Suspense boundary). Pages with their own loading.tsx override this. Keeps
 * navigation feeling immediate while the server component fetches data.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="gap-3 p-4 ring-1 ring-border/50">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 ring-1 ring-border/50 lg:col-span-2">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 ring-1 ring-border/50">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
