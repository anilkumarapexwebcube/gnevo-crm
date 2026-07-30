import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TicketThread } from './_components/ticket-thread';
import { TicketIssueButton } from './_components/ticket-issue-button';
import { TICKET_PRIORITY_STYLES, TICKET_STATUS_STYLES, ticketSla } from '../_lib/styles';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  author: { fullName: string } | null;
}
interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  customer: { id: string; name: string } | null;
  messages: Message[];
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ticket: Ticket;
  try {
    ticket = await apiServer<Ticket>(`/v1/tickets/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Button
        nativeButton={false}
        render={<Link href="/tickets" />}
        variant="ghost"
        size="sm"
        className="w-fit rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to tickets
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{ticket.subject}</h1>
        <Badge variant="outline" className={`rounded-full shadow-sm ${TICKET_PRIORITY_STYLES[ticket.priority] ?? ''}`}>
          {ticket.priority}
        </Badge>
        <Badge variant="outline" className={`rounded-full shadow-sm ${TICKET_STATUS_STYLES[ticket.status] ?? ''}`}>
          {ticket.status}
        </Badge>
        {(() => {
          const sla = ticketSla(ticket.priority, ticket.createdAt, ticket.status);
          return (
            <Badge variant="outline" className={`rounded-full shadow-sm ${sla.style}`}>
              {sla.label}
            </Badge>
          );
        })()}
        <div className="ml-auto">
          <TicketIssueButton ticketId={ticket.id} />
        </div>
      </div>

      <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50 bg-gradient-to-br from-card to-card/50">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">{ticket.description}</p>
        {ticket.customer && (
          <div className="mt-6 flex items-center gap-2 border-t border-border/40 pt-4">
            <span className="grid size-6 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
              {ticket.customer.name.charAt(0)}
            </span>
            <p className="text-sm font-medium text-muted-foreground">
              Customer: <span className="text-foreground">{ticket.customer.name}</span>
            </p>
          </div>
        )}
      </Card>

      <TicketThread
        id={ticket.id}
        status={ticket.status}
        subject={ticket.subject}
        description={ticket.description}
        customerName={ticket.customer?.name}
        messages={ticket.messages}
      />
    </div>
  );
}
