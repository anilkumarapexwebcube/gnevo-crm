'use server';

import { apiServer } from '@/lib/session';

export interface CustomReportResult {
  metric: string;
  valueLabel: string;
  rows: { label: string; value: number }[];
}

export async function runCustomReport(opts: {
  source: string;
  groupBy: string;
  metric: string;
}): Promise<{ ok: boolean; data?: CustomReportResult; error?: string }> {
  try {
    const qs = new URLSearchParams(opts).toString();
    const data = await apiServer<CustomReportResult>(`/v1/reports/custom?${qs}`);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not run report' };
  }
}
