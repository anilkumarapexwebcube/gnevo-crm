import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { ReportsView } from './_components/reports-view';
import { CustomReportBuilder } from './_components/custom-report-builder';
import { ArReport, type ArData } from './_components/ar-report';

interface Bucket {
  key: string;
  count: number;
  value?: number;
}
interface Overview {
  totals: { leads: number; openForecast: number; paidRevenue: number; openTasks: number };
  leadsByStatus: Bucket[];
  leadsBySource: Bucket[];
  dealsByStage: Bucket[];
  invoiceRevenue: Bucket[];
  tasksByStatus: Bucket[];
}

export default async function ReportsPage() {
  let data: Overview | null = null;
  let ar: ArData | null = null;
  try {
    [data, ar] = await Promise.all([
      apiServer<Overview>('/v1/reports/overview'),
      apiServer<ArData>('/v1/reports/ar'),
    ]);
  } catch {
    /* ignore */
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Analytics across leads, deals, invoices &amp; tasks. Export any chart to CSV.
        </p>
      </div>

      {ar && <ArReport data={ar} />}

      <CustomReportBuilder />

      {data ? (
        <ReportsView data={data} />
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load reports. Please refresh.
        </Card>
      )}
    </div>
  );
}
