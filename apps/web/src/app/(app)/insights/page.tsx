import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { BiDashboard, type BiData } from './_components/bi-dashboard';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  let data: BiData | null = null;
  try {
    data = await apiServer<BiData>('/v1/reports/bi');
  } catch {
    /* ignore */
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">BI Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Executive analytics — pipeline, conversion &amp; revenue at a glance.</p>
      </div>
      {data ? (
        <BiDashboard data={data} />
      ) : (
        <Card className="rounded-2xl border-0 p-8 text-center text-sm text-muted-foreground ring-1 ring-border/50">
          Couldn&apos;t load analytics. Please refresh.
        </Card>
      )}
    </div>
  );
}
