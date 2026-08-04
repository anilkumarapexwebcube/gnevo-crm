'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createAutomation } from '../actions';
import { TRIGGER_LABELS, ACTION_LABELS } from '../_lib/labels';

interface Template {
  name: string;
  description: string;
  triggerType: string;
  actions: { type: string; config: string }[];
}

const TEMPLATES: Template[] = [
  {
    name: 'Welcome new leads',
    description: 'Email a warm welcome to every new lead, and alert its owner in-app.',
    triggerType: 'lead.created',
    actions: [
      { type: 'send_email', config: '{{email}}' },
      { type: 'send_notification', config: '' },
    ],
  },
  {
    name: 'New customer onboarding',
    description: 'Create an onboarding task and notify the owner when a customer is added.',
    triggerType: 'customer.created',
    actions: [
      { type: 'create_task', config: 'Onboarding: {{name}}' },
      { type: 'send_notification', config: '' },
    ],
  },
  {
    name: 'Lead status changed',
    description: 'Notify the lead owner whenever the lead moves to a new status.',
    triggerType: 'lead.status_changed',
    actions: [{ type: 'send_notification', config: '' }],
  },
  {
    name: 'Deal stage change alert',
    description: 'Notify the deal owner whenever a deal moves to a new stage.',
    triggerType: 'deal.stage_changed',
    actions: [{ type: 'send_notification', config: '' }],
  },
  {
    name: 'Task follow-up',
    description: 'Create a follow-up task automatically when a task is completed.',
    triggerType: 'task.completed',
    actions: [{ type: 'create_task', config: 'Follow up after: {{name}}' }],
  },
];

export function AutomationTemplates() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function use(t: Template) {
    startTransition(async () => {
      const res = await createAutomation({
        name: t.name,
        triggerType: t.triggerType,
        definition: { actions: t.actions },
      });
      if (res.ok) {
        toast.success(`"${t.name}" created (paused). Activate it when ready.`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to create from template');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Sparkles />
            Templates
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Automation templates</DialogTitle>
          <DialogDescription>One-click starting points. Customize after adding.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {TEMPLATES.map((t) => (
            <Card key={t.name} className="flex-row items-center justify-between gap-3 p-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge variant="secondary">{TRIGGER_LABELS[t.triggerType] ?? t.triggerType}</Badge>
                  {t.actions.map((a, i) => (
                    <Badge key={i} variant="outline" className="text-muted-foreground">
                      {ACTION_LABELS[a.type] ?? a.type}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button size="sm" disabled={pending} onClick={() => use(t)}>
                <Zap />
                Use
              </Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
