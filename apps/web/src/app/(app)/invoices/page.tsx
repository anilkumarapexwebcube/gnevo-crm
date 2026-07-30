import { Receipt } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { DetailLink } from '@/components/detail-link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NewInvoiceDialog } from './_components/new-invoice-dialog';
import { InvoiceRowActions } from './_components/invoice-row-actions';

interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  currency: string;
  customerName: string | null;
  total: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
  pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  sent: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  void: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
};

function money(v: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v);
}

export default async function InvoicesPage() {
  let invoices: InvoiceRow[] = [];
  let customers: { id: string; name: string }[] = [];
  let loadError = false;
  try {
    const [inv, cust] = await Promise.all([
      apiServer<{ data: InvoiceRow[] }>('/v1/invoices?limit=50'),
      apiServer<{ data: { id: string; name: string }[] }>('/v1/customers?limit=100'),
    ]);
    invoices = inv.data;
    customers = cust.data;
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
          </p>
        </div>
        <NewInvoiceDialog customers={customers} />
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl border-0 ring-1 ring-border/50">
          Couldn&apos;t load invoices. Please refresh.
        </Card>
      ) : invoices.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-16 text-center rounded-2xl border-0 ring-1 ring-border/50 bg-gradient-to-b from-card to-card/50 shadow-sm">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <Receipt className="size-8" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first invoice to bill a customer.</p>
          </div>
          <div className="mt-2">
            <NewInvoiceDialog customers={customers} />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 rounded-2xl border-0 ring-1 ring-border/50 shadow-sm bg-gradient-to-b from-card to-card/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/40">
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-primary/5 transition-colors duration-200 border-border/30">
                  <TableCell className="font-semibold text-foreground py-4">
                    <DetailLink
                      href={`/invoices/${inv.id}`}
                      tip="View invoice"
                      className="hover:text-primary transition-colors duration-200"
                    >
                      {inv.number}
                    </DetailLink>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-medium">{inv.customerName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-full shadow-sm font-semibold text-xs ${STATUS_STYLES[inv.status] ?? ''}`}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-foreground">
                    {money(inv.total, inv.currency)}
                  </TableCell>
                  <TableCell>
                    <InvoiceRowActions id={inv.id} number={inv.number} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
