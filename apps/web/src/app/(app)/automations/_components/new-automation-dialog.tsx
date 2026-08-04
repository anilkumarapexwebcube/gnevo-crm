'use client';

import { useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createAutomation } from '../actions';

const TRIGGERS = [
  { value: 'lead.created', label: 'Lead created' },
  { value: 'lead.status_changed', label: 'Lead status changed' },
  { value: 'customer.created', label: 'Customer created' },
  { value: 'deal.created', label: 'Deal created' },
  { value: 'deal.stage_changed', label: 'Deal stage changed' },
  { value: 'task.completed', label: 'Task completed' },
  { value: 'manual', label: 'Manual' },
];

const ACTIONS = [
  { value: 'send_email', label: 'Send email' },
  { value: 'send_notification', label: 'Send notification' },
  { value: 'create_task', label: 'Create task' },
  { value: 'assign_owner', label: 'Assign owner' },
  { value: 'webhook', label: 'Call webhook' },
  { value: 'ai_generate', label: 'AI generate' },
];

// Per-action guidance so the Config field is never a mystery.
const ACTION_HELP: Record<string, { placeholder: string; help: string; showTokens?: boolean }> = {
  send_email: {
    placeholder: 'Who to email — a fixed address, or {{email}}',
    help: 'Send to a fixed email, or use {{email}} to email the record itself (e.g. welcome a new lead). Add “| your message” for custom text.',
    showTokens: true,
  },
  send_notification: {
    placeholder: 'Email to notify (blank = the record’s owner)',
    help: 'Sends an in-app notification (the bell). Enter an email — usually your own — to be notified.',
  },
  create_task: {
    placeholder: 'Task title (optional) — e.g. Call {{name}}',
    help: 'Creates a to-do assigned to the record’s owner. Blank = a default title.',
    showTokens: true,
  },
  assign_owner: {
    placeholder: 'New owner’s email',
    help: 'Reassigns the lead / customer / deal to this person.',
  },
  webhook: {
    placeholder: 'https://your-endpoint.com/hook',
    help: 'We send (POST) the event data to this URL.',
  },
  ai_generate: {
    placeholder: 'What should the AI write? (optional)',
    help: 'e.g. “Draft a friendly follow-up note.” Leave blank for a smart default.',
  },
};

// Fields from the record that can be inserted into a config value.
const FIELD_TOKENS = [
  { token: '{{email}}', label: 'Email' },
  { token: '{{name}}', label: 'Name' },
  { token: '{{company}}', label: 'Company' },
];

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'exists', label: 'is present' },
  { value: 'not_exists', label: 'is empty' },
];

interface Step {
  type: string;
  config: string;
}

export function NewAutomationDialog({ meEmail }: { meEmail?: string | null }) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState('lead.created');
  const [steps, setSteps] = useState<Step[]>([{ type: 'send_email', config: '' }]);
  // IF condition (optional)
  const [condField, setCondField] = useState('');
  const [condOp, setCondOp] = useState('equals');
  const [condValue, setCondValue] = useState('');
  // Delay before actions (minutes)
  const [delayMin, setDelayMin] = useState('0');
  // Wait for a second event (optional)
  const [waitFor, setWaitFor] = useState('none');
  const [waitHours, setWaitHours] = useState('24');
  const [pending, startTransition] = useTransition();

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const needsValue = condOp !== 'exists' && condOp !== 'not_exists';
    const input = {
      name: String(fd.get('name') ?? '').trim(),
      triggerType: trigger,
      definition: {
        actions: steps,
        ...(condField.trim()
          ? {
              condition: {
                field: condField.trim(),
                operator: condOp,
                ...(needsValue ? { value: condValue.trim() } : {}),
              },
            }
          : {}),
        ...(Number(delayMin) > 0 ? { delaySeconds: Math.round(Number(delayMin) * 60) } : {}),
        ...(waitFor !== 'none'
          ? {
              waitFor: {
                triggerType: waitFor,
                withinSeconds: Math.max(60, Math.round(Number(waitHours) * 3600)) || 86400,
              },
            }
          : {}),
      },
    };
    startTransition(async () => {
      const res = await createAutomation(input);
      if (res.ok) {
        toast.success('Automation created (inactive)');
        setOpen(false);
        setSteps([{ type: 'send_email', config: '' }]);
        setCondField('');
        setCondOp('equals');
        setCondValue('');
        setDelayMin('0');
        setWaitFor('none');
        setWaitHours('24');
      } else {
        toast.error(res.error ?? 'Failed to create automation');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New automation
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New automation</DialogTitle>
          <DialogDescription>
            Trigger → actions. Runs once execution is enabled (needs Redis).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="New-lead nurture" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trigger">When (trigger)</Label>
            <Select items={TRIGGERS} value={trigger} onValueChange={(v) => setTrigger(v ?? 'manual')}>
              <SelectTrigger id="trigger" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Then (actions)</Label>
            <div className="flex flex-col gap-2.5">
              {steps.map((step, i) => {
                const hint = ACTION_HELP[step.type];
                const setConfig = (config: string) => updateStep(i, { config });
                const appendToken = (token: string) =>
                  updateStep(i, { config: step.config ? `${step.config} ${token}` : token });
                return (
                  <div key={i} className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                    <div className="flex items-center gap-2">
                      <Select
                        items={ACTIONS}
                        value={step.type}
                        onValueChange={(v) => updateStep(i, { type: v ?? 'send_email', config: '' })}
                      >
                        <SelectTrigger size="sm" className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIONS.map((a) => (
                            <SelectItem key={a.value} value={a.value}>
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="flex-1" />
                      {steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label="Remove action"
                        >
                          <X />
                        </Button>
                      )}
                    </div>

                    <Input
                      value={step.config}
                      onChange={(e) => updateStep(i, { config: e.target.value })}
                      placeholder={hint?.placeholder ?? 'Config (optional)'}
                      className="mt-2 h-8"
                    />

                    {/* One-click suggestions so nobody has to guess the syntax. */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {step.type === 'send_email' && (
                        <Chip onClick={() => setConfig('{{email}}')}>Email the record</Chip>
                      )}
                      {(step.type === 'send_email' || step.type === 'send_notification') && meEmail && (
                        <Chip onClick={() => setConfig(meEmail)}>
                          {step.type === 'send_notification' ? 'Notify me' : 'Email me'}
                        </Chip>
                      )}
                      {step.type === 'send_notification' && (
                        <Chip onClick={() => setConfig('')}>Notify record owner</Chip>
                      )}
                      {hint?.showTokens &&
                        FIELD_TOKENS.map((t) => (
                          <Chip key={t.token} onClick={() => appendToken(t.token)}>
                            + {t.label}
                          </Chip>
                        ))}
                    </div>

                    {hint?.help && <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{hint.help}</p>}
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setSteps((prev) => [...prev, { type: 'send_email', config: '' }])}
            >
              <Plus />
              Add action
            </Button>
          </div>

          {/* Optional IF condition */}
          <div className="grid gap-2">
            <Label>Only if (optional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={condField}
                onChange={(e) => setCondField(e.target.value)}
                placeholder="field e.g. status"
                className="h-8 w-36"
              />
              <Select items={OPERATORS} value={condOp} onValueChange={(v) => setCondOp(v ?? 'equals')}>
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {condOp !== 'exists' && condOp !== 'not_exists' && (
                <Input
                  value={condValue}
                  onChange={(e) => setCondValue(e.target.value)}
                  placeholder="value"
                  className="h-8 w-32"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Matches the event data (e.g. field <code>stageName</code> contains{' '}
              <code>Won</code>). Leave blank to always run.
            </p>
          </div>

          {/* Delay */}
          <div className="grid gap-2">
            <Label htmlFor="delay">Delay before running (minutes)</Label>
            <Input
              id="delay"
              type="number"
              min="0"
              value={delayMin}
              onChange={(e) => setDelayMin(e.target.value)}
              className="h-8 w-28"
            />
          </div>

          {/* Wait for event */}
          <div className="grid gap-2">
            <Label>Wait for event (optional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={[{ value: 'none', label: "Don't wait" }, ...TRIGGERS]}
                value={waitFor}
                onValueChange={(v) => setWaitFor(v ?? 'none')}
              >
                <SelectTrigger size="sm" className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[{ value: 'none', label: "Don't wait" }, ...TRIGGERS].map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {waitFor !== 'none' && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  within
                  <Input
                    type="number"
                    min="1"
                    value={waitHours}
                    onChange={(e) => setWaitHours(e.target.value)}
                    className="h-8 w-20"
                  />
                  hours
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Runs the actions only after this second event fires for the same record (else expires).
            </p>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" loading={pending}>
              {pending ? 'Saving…' : 'Create automation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Small one-click pill that fills a config value — no syntax to memorise. */
function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary cursor-pointer"
    >
      {children}
    </button>
  );
}
