import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InvoiceActions } from './_components/invoice-actions';
import { InvoiceToolbar } from './_components/invoice-toolbar';

interface Line {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
}
interface Invoice {
  id: string;
  number: string;
  status: string;
  currency: string;
  notes: string | null;
  total: number;
  createdAt: string;
  dueDate: string | null;
  customer: { id: string; name: string } | null;
  lines: Line[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
  pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  sent: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  void: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const { checkout } = await searchParams;

  if (checkout === 'success') {
    try {
      await apiServer(`/v1/invoices/${id}/confirm`, { method: 'POST' });
    } catch {
      /* ignore */
    }
  }

  let invoice: Invoice;
  try {
    invoice = await apiServer<Invoice>(`/v1/invoices/${id}`);
  } catch {
    notFound();
  }

  const money = (v: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: invoice.currency }).format(v);
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="no-print flex items-center justify-between">
        <Button
          nativeButton={false}
          render={<Link href="/invoices" />}
          variant="ghost"
          size="sm"
          className="w-fit"
        >
          <ArrowLeft />
          Back to invoices
        </Button>
        <div className="flex items-center gap-2">
          <InvoiceActions id={invoice.id} status={invoice.status} />
          <InvoiceToolbar />
        </div>
      </div>

      {/* Invoice sheet */}
      <Card className="print-sheet gap-0 p-0">
        <div className="flex items-start justify-between gap-4 border-b p-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                G
              </span>
              <span className="text-lg font-semibold">Gnevo CRM</span>
            </div>
            <p className="text-xs text-muted-foreground">Digital Marketing &amp; SEO Agency</p>
            <p className="text-xs text-muted-foreground">support@gnevotech.org</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{invoice.number}</p>
            <Badge
              variant="outline"
              className={`mt-2 rounded-full px-3 py-0.5 text-xs font-bold tracking-wide ${STATUS_STYLES[invoice.status] ?? ''}`}
            >
              {invoice.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b p-8 text-sm">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Bill to</p>
            <p className="font-medium">{invoice.customer?.name ?? 'No customer'}</p>
          </div>
          <div className="text-right">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice date</span>
              <span className="font-medium tabular-nums">{fmtDate(invoice.createdAt)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Due date</span>
              <span className="font-medium tabular-nums">{fmtDate(invoice.dueDate)}</span>
            </div>
          </div>
        </div>

        <div className="p-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit price</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="py-3">{l.description}</td>
                  <td className="py-3 text-right tabular-nums">{l.quantity}</td>
                  <td className="py-3 text-right tabular-nums">{money(Number(l.unitPrice))}</td>
                  <td className="py-3 text-right tabular-nums">{money(l.quantity * Number(l.unitPrice))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-56">
              <div className="flex justify-between border-b py-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{money(invoice.total)}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{money(invoice.total)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 border-t pt-4 text-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Thank you for your business.
          </p>
        </div>
      </Card>
    </div>
  );
}
