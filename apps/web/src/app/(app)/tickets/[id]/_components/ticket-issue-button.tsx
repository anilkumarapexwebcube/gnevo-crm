'use client';

import { useState } from 'react';
import { GitBranch, Kanban, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createTicketIssue } from '../../actions';

export function TicketIssueButton({ ticketId }: { ticketId: string }) {
  const [busy, setBusy] = useState(false);

  async function create(provider: 'github' | 'jira') {
    setBusy(true);
    const res = await createTicketIssue(ticketId, provider);
    setBusy(false);
    if (res.ok && res.url) {
      toast.success(`${provider === 'github' ? 'GitHub' : 'Jira'} issue created`, {
        action: { label: 'Open', onClick: () => window.open(res.url, '_blank') },
      });
    } else {
      toast.error(res.error ?? 'Could not create issue');
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" loading={busy}>
            <ExternalLink className="size-4" />
            Create issue
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => create('github')}>
          <GitBranch className="size-4" />
          GitHub issue
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => create('jira')}>
          <Kanban className="size-4" />
          Jira issue
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
