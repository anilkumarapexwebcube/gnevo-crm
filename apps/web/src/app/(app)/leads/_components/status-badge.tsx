import { Badge } from '@/components/ui/badge';

const STATUS_STYLES: Record<string, string> = {
  new: 'text-info border-info/30 bg-info/10',
  contacted: 'text-warning border-warning/30 bg-warning/10',
  qualified: 'text-success border-success/30 bg-success/10',
  unqualified: 'text-muted-foreground border-border bg-muted',
  converted: 'text-primary border-primary/30 bg-primary/10',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  unqualified: 'Unqualified',
  converted: 'Converted',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] ?? ''}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
