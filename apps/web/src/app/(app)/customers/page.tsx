import { Building2 } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { DetailLink } from '@/components/detail-link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { NewCustomerDialog } from './_components/new-customer-dialog';
import { ImportExportButtons } from '@/components/import-export-buttons';
import { CustomerRowActions } from './_components/customer-row-actions';
import { CustomerStatusBadge } from './_components/customer-status-badge';
import { CustomersFilterBar } from './_components/customers-filter-bar';

interface CustomerRow {
  id: string;
  name: string;
  type: string;
  status: string;
  industry: string | null;
  website: string | null;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ limit: '50' });
  if (sp.status) params.set('status', sp.status);
  if (sp.type) params.set('type', sp.type);
  if (sp.q) params.set('q', sp.q);

  let customers: CustomerRow[] = [];
  let loadError = false;
  try {
    const res = await apiServer<{ data: CustomerRow[] }>(`/v1/customers?${params.toString()}`);
    customers = res.data;
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportButtons entity="customers" />
          <NewCustomerDialog />
        </div>
      </div>

      <div className="mb-2">
        <CustomersFilterBar status={sp.status ?? 'all'} type={sp.type ?? 'all'} q={sp.q ?? ''} />
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load customers. Please refresh.
        </Card>
      ) : customers.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Building2 className="size-6" />
          </span>
          <div>
            <p className="font-medium">No customers yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first customer account to get started.
            </p>
          </div>
          <NewCustomerDialog />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="hover:bg-secondary/40 transition-colors border-border/40">
                  <TableCell className="font-medium">
                    <DetailLink
                      href={`/customers/${c.id}`}
                      tip="View customer"
                      className="hover:text-primary hover:underline"
                    >
                      {c.name}
                    </DetailLink>
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">{c.type}</TableCell>
                  <TableCell>
                    <CustomerStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.industry ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.website ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell>
                    <CustomerRowActions id={c.id} name={c.name} />
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
