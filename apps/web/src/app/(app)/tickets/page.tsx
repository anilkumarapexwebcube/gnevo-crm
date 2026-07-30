import { LifeBuoy } from 'lucide-react';
import { apiServer } from '@/lib/session';
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
import { DetailLink } from '@/components/detail-link';
import { NewTicketDialog } from './_components/new-ticket-dialog';
import { TicketRowActions } from './_components/ticket-row-actions';
import { TICKET_PRIORITY_STYLES, TICKET_STATUS_STYLES } from './_lib/styles';

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  customer: { name: string } | null;
}

export default async function TicketsPage() {
  let tickets: TicketRow[] = [];
  let customers: { id: string; name: string }[] = [];
  let loadError = false;
  try {
    const [t, c] = await Promise.all([
      apiServer<TicketRow[]>('/v1/tickets'),
      apiServer<{ data: { id: string; name: string }[] }>('/v1/customers?limit=100'),
    ]);
    tickets = t;
    customers = c.data;
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support tickets</h1>
          <p className="text-sm text-muted-foreground">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
        <NewTicketDialog customers={customers} />
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl border-0 ring-1 ring-border/50">
          Couldn&apos;t load tickets. Please refresh.
        </Card>
      ) : tickets.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center rounded-2xl border-0 ring-1 ring-border/50 bg-gradient-to-b from-card to-card/50 shadow-sm">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary mb-2">
            <LifeBuoy className="size-6" />
          </span>
          <div>
            <p className="font-semibold text-lg text-foreground">No tickets yet</p>
            <p className="text-sm text-muted-foreground mt-1">Log a support request to get started.</p>
          </div>
          <div className="mt-2">
            <NewTicketDialog customers={customers} />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 rounded-2xl shadow-sm border-0 ring-1 ring-border/50 bg-gradient-to-b from-card to-card/50 transition-all hover:shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t.id} className="hover:bg-primary/5 transition-colors duration-200 border-border/40">
                  <TableCell className="font-medium py-4">
                    <DetailLink href={`/tickets/${t.id}`} tip="Open ticket">
                      {t.subject}
                    </DetailLink>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.customer?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TICKET_PRIORITY_STYLES[t.priority] ?? ''}>
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TICKET_STATUS_STYLES[t.status] ?? ''}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TicketRowActions id={t.id} subject={t.subject} />
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
