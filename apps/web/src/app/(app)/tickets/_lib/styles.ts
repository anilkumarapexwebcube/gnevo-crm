export const TICKET_STATUS_STYLES: Record<string, string> = {
  open: 'text-info border-info/30 bg-info/10',
  pending: 'text-warning border-warning/30 bg-warning/10',
  resolved: 'text-success border-success/30 bg-success/10',
  closed: 'text-foreground/70 border-foreground/20 bg-foreground/5',
};

export const TICKET_PRIORITY_STYLES: Record<string, string> = {
  low: 'text-foreground/70 border-foreground/20 bg-foreground/5',
  medium: 'text-info border-info/30 bg-info/10',
  high: 'text-warning border-warning/30 bg-warning/10',
  urgent: 'text-danger border-danger/30 bg-danger/10',
};

export const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

/** SLA target hours by priority (first-response / resolution guideline). */
const SLA_HOURS: Record<string, number> = { urgent: 4, high: 24, medium: 72, low: 168 };

export function ticketSla(
  priority: string,
  createdAt: string,
  status: string,
): { label: string; style: string } {
  if (status === 'resolved' || status === 'closed') {
    return { label: 'SLA met', style: 'text-success border-success/30 bg-success/10' };
  }
  const hours = SLA_HOURS[priority] ?? 72;
  const due = new Date(createdAt).getTime() + hours * 3600_000;
  const diffMs = due - Date.now();
  if (diffMs <= 0) {
    return { label: 'SLA overdue', style: 'text-danger border-danger/30 bg-danger/10' };
  }
  const h = Math.floor(diffMs / 3600_000);
  const label = h >= 24 ? `SLA: ${Math.floor(h / 24)}d left` : `SLA: ${Math.max(1, h)}h left`;
  const style =
    diffMs < 4 * 3600_000
      ? 'text-warning border-warning/30 bg-warning/10'
      : 'text-info border-info/30 bg-info/10';
  return { label, style };
}
