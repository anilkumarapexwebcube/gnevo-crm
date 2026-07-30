'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Send, GitBranch, Kanban, Check, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  getIntegrations,
  updateIntegrations,
  testIntegration,
  type IntegrationsConfig,
} from '../actions';

export function IntegrationsManager() {
  const [cfg, setCfg] = useState<IntegrationsConfig | null>(null);
  const [initializing, setInitializing] = useState(true);

  // form state
  const [slack, setSlack] = useState({ webhookUrl: '', events: [] as string[], enabled: false });
  const [telegram, setTelegram] = useState({ botToken: '', chatId: '', events: [] as string[], enabled: false });
  const [github, setGithub] = useState({ token: '', repo: '', enabled: false });
  const [jira, setJira] = useState({ domain: '', email: '', token: '', projectKey: '', enabled: false });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const c = await getIntegrations();
    if (c) {
      setCfg(c);
      setSlack({ webhookUrl: '', events: c.slack.events, enabled: c.slack.enabled });
      setTelegram({ botToken: '', chatId: c.telegram.chatId, events: c.telegram.events, enabled: c.telegram.enabled });
      setGithub({ token: '', repo: c.github.repo, enabled: c.github.enabled });
      setJira({ domain: c.jira.domain, email: c.jira.email, token: '', projectKey: c.jira.projectKey, enabled: c.jira.enabled });
    }
    setInitializing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    const res = await updateIntegrations({ slack, telegram, github, jira });
    setSaving(false);
    if (res.ok) {
      toast.success('Integrations saved');
      await load();
    } else toast.error(res.error ?? 'Could not save');
  }

  async function test(provider: string) {
    setTesting(provider);
    // Persist first so the server has the latest secrets to test with.
    await updateIntegrations({ slack, telegram, github, jira });
    const res = await testIntegration(provider);
    setTesting(null);
    if (res.ok) toast.success('Test message sent — check your channel');
    else toast.error(res.error ?? 'Test failed');
  }

  const toggleEvent = (list: string[], ev: string) =>
    list.includes(ev) ? list.filter((x) => x !== ev) : [...list, ev];

  if (initializing) {
    return (
      <Card className="rounded-2xl border-0 p-6 shadow-sm ring-1 ring-border/50">
        <Skeleton className="mb-4 h-6 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </Card>
    );
  }
  if (!cfg) return null;

  return (
    <Card className="flex flex-col gap-5 rounded-2xl border-0 p-6 shadow-sm ring-1 ring-border/50">
      <div className="flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <Plug className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Integrations</h2>
          <p className="text-xs text-muted-foreground">Send event notifications and push tickets to your tools.</p>
        </div>
      </div>

      {/* Slack */}
      <Provider icon={MessageSquare} name="Slack" connected={cfg.slack.configured} enabled={slack.enabled} onToggle={(v) => setSlack((s) => ({ ...s, enabled: v }))}>
        <Field label="Incoming webhook URL">
          <Input value={slack.webhookUrl} onChange={(e) => setSlack((s) => ({ ...s, webhookUrl: e.target.value }))} placeholder={cfg.slack.configured ? '•••••••• (saved — leave blank to keep)' : 'https://hooks.slack.com/services/…'} />
        </Field>
        <EventPicker events={cfg.availableEvents} selected={slack.events} onToggle={(ev) => setSlack((s) => ({ ...s, events: toggleEvent(s.events, ev) }))} />
        <TestButton onClick={() => test('slack')} loading={testing === 'slack'} />
      </Provider>

      {/* Telegram */}
      <Provider icon={Send} name="Telegram" connected={cfg.telegram.configured} enabled={telegram.enabled} onToggle={(v) => setTelegram((s) => ({ ...s, enabled: v }))}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bot token">
            <Input value={telegram.botToken} onChange={(e) => setTelegram((s) => ({ ...s, botToken: e.target.value }))} placeholder={cfg.telegram.configured ? '•••••••• (saved)' : '123456:ABC-DEF…'} />
          </Field>
          <Field label="Chat ID">
            <Input value={telegram.chatId} onChange={(e) => setTelegram((s) => ({ ...s, chatId: e.target.value }))} placeholder="-1001234567890" />
          </Field>
        </div>
        <EventPicker events={cfg.availableEvents} selected={telegram.events} onToggle={(ev) => setTelegram((s) => ({ ...s, events: toggleEvent(s.events, ev) }))} />
        <TestButton onClick={() => test('telegram')} loading={testing === 'telegram'} />
      </Provider>

      {/* GitHub */}
      <Provider icon={GitBranch} name="GitHub" connected={cfg.github.configured} enabled={github.enabled} onToggle={(v) => setGithub((s) => ({ ...s, enabled: v }))}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Repository (owner/name)">
            <Input value={github.repo} onChange={(e) => setGithub((s) => ({ ...s, repo: e.target.value }))} placeholder="acme/website" />
          </Field>
          <Field label="Personal access token">
            <Input value={github.token} onChange={(e) => setGithub((s) => ({ ...s, token: e.target.value }))} placeholder={cfg.github.configured ? '•••••••• (saved)' : 'ghp_…'} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Adds a &quot;Create issue&quot; action on tickets.</p>
      </Provider>

      {/* Jira */}
      <Provider icon={Kanban} name="Jira" connected={cfg.jira.configured} enabled={jira.enabled} onToggle={(v) => setJira((s) => ({ ...s, enabled: v }))}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Site domain">
            <Input value={jira.domain} onChange={(e) => setJira((s) => ({ ...s, domain: e.target.value }))} placeholder="yourteam.atlassian.net" />
          </Field>
          <Field label="Project key">
            <Input value={jira.projectKey} onChange={(e) => setJira((s) => ({ ...s, projectKey: e.target.value }))} placeholder="CRM" />
          </Field>
          <Field label="Account email">
            <Input value={jira.email} onChange={(e) => setJira((s) => ({ ...s, email: e.target.value }))} placeholder="you@company.com" />
          </Field>
          <Field label="API token">
            <Input value={jira.token} onChange={(e) => setJira((s) => ({ ...s, token: e.target.value }))} placeholder={cfg.jira.configured ? '•••••••• (saved)' : 'API token'} />
          </Field>
        </div>
      </Provider>

      <div className="flex justify-end border-t border-border/40 pt-4">
        <Button onClick={save} loading={saving}>Save integrations</Button>
      </div>
    </Card>
  );
}

function Provider({
  icon: Icon,
  name,
  connected,
  enabled,
  onToggle,
  children,
}: {
  icon: typeof MessageSquare;
  name: string;
  connected: boolean;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-foreground" />
        <span className="text-sm font-semibold text-foreground">{name}</span>
        {connected && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Check className="size-3" /> connected
          </span>
        )}
        <button
          role="switch"
          aria-checked={enabled}
          aria-label={`${name} ${enabled ? 'enabled' : 'disabled'}`}
          onClick={() => onToggle(!enabled)}
          className={cn('relative ml-auto h-5 w-9 shrink-0 rounded-full transition-colors', enabled ? 'bg-primary' : 'bg-secondary')}
        >
          <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', enabled ? 'left-[1.125rem]' : 'left-0.5')} />
        </button>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function EventPicker({
  events,
  selected,
  onToggle,
}: {
  events: { value: string; label: string }[];
  selected: string[];
  onToggle: (ev: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Notify on events</Label>
      <div className="flex flex-wrap gap-1.5">
        {events.map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => onToggle(e.value)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
              selected.includes(e.value) ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:bg-secondary/50',
            )}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TestButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div>
      <Button variant="outline" size="xs" onClick={onClick} loading={loading}>
        Send test
      </Button>
    </div>
  );
}
