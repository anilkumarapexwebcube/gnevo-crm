import { Skeleton } from '@/components/ui/skeleton';

export default function DealsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
