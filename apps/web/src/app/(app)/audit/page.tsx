import { ShieldAlert, ScrollText } from 'lucide-react';
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

export const metadata = {
  title: 'Audit Log | Gnevo CRM',
  description: 'Security audit trail of sensitive actions.',
};

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ip: string | null;
  createdAt: string;
}

const ACTION_STYLE = (action: string): string => {
  if (action.includes('deleted') || action.includes('revoked') || action.includes('failed'))
    return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400';
  if (action.includes('login') || action.includes('granted') || action.includes('enabled'))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400';
  return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400';
};

export default async function AuditPage() {
  let entries: AuditEntry[] | null = null;
  let forbidden = false;
  try {
    entries = await apiServer<AuditEntry[]>('/v1/audit?limit=200');
  } catch (e) {
    if ((e as { status?: number }).status === 403) forbidden = true;
    entries = [];
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <ScrollText className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Immutable record of security-sensitive actions
          </p>
        </div>
      </div>

      {forbidden ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <ShieldAlert className="size-8 text-muted-foreground/50" />
          <div>
            <p className="text-lg font-semibold">Admin access required</p>
            <p className="text-sm text-muted-foreground">
              Only owners and admins can view the audit log.
            </p>
          </div>
        </Card>
      ) : entries && entries.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">No audit events yet.</Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map((e) => (
                <TableRow
                  key={e.id}
                  className="border-border/30 transition-colors hover:bg-primary/5"
                >
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {fmt(e.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    {e.actorName ?? <span className="text-muted-foreground">System / unknown</span>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`rounded-full font-medium ${ACTION_STYLE(e.action)}`}
                    >
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.resource ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.ip ?? '—'}
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
