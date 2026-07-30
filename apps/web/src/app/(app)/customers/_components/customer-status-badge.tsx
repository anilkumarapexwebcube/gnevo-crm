import { Badge } from '@/components/ui/badge';

const STYLES: Record<string, string> = {
  active: 'text-success border-success/30 bg-success/10',
  prospect: 'text-info border-info/30 bg-info/10',
  churned: 'text-danger border-danger/30 bg-danger/10',
  archived: 'text-muted-foreground border-border bg-muted',
};

const LABELS: Record<string, string> = {
  active: 'Active',
  prospect: 'Prospect',
  churned: 'Churned',
  archived: 'Archived',
};

export function CustomerStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STYLES[status] ?? ''}>
      {LABELS[status] ?? status}
    </Badge>
  );
}
