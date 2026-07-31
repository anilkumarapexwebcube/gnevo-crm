'use client';

import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { ShieldCheck, Plus, Pencil, Copy, Trash2, Lock, Check, Sparkles, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listRoles,
  createRole,
  updateRole,
  cloneRole,
  deleteRole,
  type RoleRow,
  type RoleCatalog,
  type RolePerm,
} from '@/lib/team-actions';

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Friendly labels + section grouping for the permission matrix, so whoever
 * builds a role sees the same tools/sections as the app sidebar (not raw
 * resource keys). Anything without an entry falls back to a humanized key.
 */
const RESOURCE_META: Record<string, { label: string; group: string; hint: string }> = {
  lead: { label: 'Leads', group: 'CRM', hint: 'Prospective customers in the sales pipeline' },
  customer: { label: 'Customers', group: 'CRM', hint: 'Won accounts / companies' },
  contact: { label: 'Contacts', group: 'CRM', hint: 'People at customer companies' },
  deal: { label: 'Deals', group: 'CRM', hint: 'Sales opportunities on the pipeline board' },
  pipeline: { label: 'Pipelines', group: 'CRM', hint: 'Pipeline & stage configuration' },
  project: { label: 'Projects', group: 'Delivery', hint: 'Client delivery projects & task boards' },
  task: { label: 'Tasks', group: 'Delivery', hint: 'Tasks across projects' },
  invoice: { label: 'Invoices', group: 'Finance', hint: 'Billing & invoices' },
  payment: { label: 'Payments', group: 'Finance', hint: 'Payment records' },
  seo_project: { label: 'SEO Projects', group: 'Marketing', hint: 'SEO projects, keywords & Search Console' },
  campaign: { label: 'Campaigns', group: 'Marketing', hint: 'Marketing campaigns' },
  article: { label: 'Content', group: 'Marketing', hint: 'Editorial content planner' },
  ticket: { label: 'Support Tickets', group: 'Support', hint: 'Customer support tickets' },
  knowledge_base: { label: 'Knowledge Base', group: 'Support', hint: 'Internal help articles' },
  announcement: { label: 'Announcements', group: 'Support', hint: 'Company-wide posts' },
  user: { label: 'Team Members', group: 'Team & HR', hint: 'Invite/manage staff (the Team page)' },
  department: { label: 'Departments', group: 'Team & HR', hint: 'Org structure — departments' },
  team: { label: 'Teams', group: 'Team & HR', hint: 'Org structure — teams' },
  office: { label: 'Offices', group: 'Team & HR', hint: 'Org structure — offices' },
  hr: { label: 'HR & Attendance', group: 'Team & HR', hint: 'Clock in/out, leave, holidays, HR analytics' },
  calendar: { label: 'Calendar', group: 'Team & HR', hint: 'Events & meetings' },
  chat: { label: 'Team Chat', group: 'Team & HR', hint: 'Internal channels & DMs' },
  automation: { label: 'Automations', group: 'Platform', hint: 'Trigger → action workflows' },
  ai: { label: 'AI Assistant & Search', group: 'Platform', hint: 'AI chat + semantic search' },
  report: { label: 'Reports & Analytics', group: 'Insights', hint: 'Reports and the BI dashboard' },
  organization: { label: 'Organization', group: 'Admin', hint: 'Workspace-level record (owner only)' },
  role: { label: 'Roles & Permissions', group: 'Admin', hint: 'This roles screen' },
  audit_log: { label: 'Audit Log', group: 'Admin', hint: 'Security audit trail' },
  setting: { label: 'Workspace Settings', group: 'Admin', hint: 'Branding, integrations, API keys, etc.' },
  api_key: { label: 'API Keys', group: 'Admin', hint: 'Programmatic API access keys' },
};
const GROUP_ORDER = ['CRM', 'Delivery', 'Finance', 'Marketing', 'Support', 'Team & HR', 'Platform', 'Insights', 'Admin', 'Other'];
const resLabel = (r: string) => RESOURCE_META[r]?.label ?? humanize(r);
const resGroup = (r: string) => RESOURCE_META[r]?.group ?? 'Other';
const key = (r: string, a: string) => `${r}:${a}`;

export function RolesManager({ canManage, initialRoles, catalog }: { canManage: boolean; initialRoles: RoleRow[]; catalog: RoleCatalog }) {
  const [roles, setRoles] = useState(initialRoles);
  const [editor, setEditor] = useState<null | { role?: RoleRow }>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => setRoles(await listRoles()), []);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    const res = await fn();
    if (res.ok) { toast.success(ok); await refresh(); } else toast.error(res.error ?? 'Failed');
  }

  function exportRole(r: RoleRow) {
    const doc = { name: r.name, key: r.key, permissions: r.permissions };
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `role-${r.key || r.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (importRef.current) importRef.current.value = '';
    if (!file) return;
    try {
      const doc = JSON.parse(await file.text()) as { name?: string; permissions?: RolePerm[] };
      if (!doc.name || !Array.isArray(doc.permissions)) {
        toast.error('Invalid role file — needs "name" and "permissions".');
        return;
      }
      await run(() => createRole(`${doc.name} (imported)`, doc.permissions!), 'Role imported');
    } catch {
      toast.error('Could not read that file. Expecting a role JSON.');
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roles &amp; permissions</h1>
            <p className="text-sm text-muted-foreground">Define what each role can do across the workspace.</p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
              <Upload className="size-4" />
              Import
            </Button>
            <Button size="sm" onClick={() => setEditor({})}>
              <Plus className="size-4" />
              New role
            </Button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {roles.map((r) => {
          const modules = Array.from(new Set(r.permissions.map((p) => p.resource)));
          return (
            <div
              key={r.id}
              className="group flex w-full items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-colors hover:border-primary/30"
            >
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-xl',
                  r.isSystem ? 'bg-primary/10 text-primary' : 'bg-linear-to-br from-primary/20 to-purple-500/10 text-primary',
                )}
              >
                {r.isSystem ? <ShieldCheck className="size-5" /> : <Sparkles className="size-5" />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-base font-semibold text-foreground">{r.name}</span>
                  {r.isSystem ? (
                    <Badge variant="outline" className="gap-0.5 text-[10px]"><Lock className="size-3" /> System</Badge>
                  ) : (
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] text-primary">Custom</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.memberCount} {r.memberCount === 1 ? 'member' : 'members'} · {r.permissions.length} permissions across {modules.length} modules
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {modules.slice(0, 6).map((m) => (
                    <span key={m} className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                      {m.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {modules.length > 6 && (
                    <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">+{modules.length - 6}</span>
                  )}
                  {modules.length === 0 && <span className="text-[11px] text-muted-foreground/70">No permissions</span>}
                </div>
              </div>

              {canManage && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setEditor({ role: r })}>
                    <Pencil className="size-3.5" />
                    {r.isSystem ? 'View' : 'Edit'}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => exportRole(r)} aria-label="Export" title="Export role (JSON)"><Download className="size-4" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => run(() => cloneRole(r.id), 'Role cloned')} aria-label="Clone" title="Clone"><Copy className="size-4" /></Button>
                  {!r.isSystem && (
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-rose-500" onClick={() => run(() => deleteRole(r.id), 'Role deleted')} aria-label="Delete" title="Delete"><Trash2 className="size-4" /></Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editor && (
        <RoleEditor
          role={editor.role}
          catalog={catalog}
          readOnly={!!editor.role?.isSystem}
          onClose={() => setEditor(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function RoleEditor({ role, catalog, readOnly, onClose, onSaved }: { role?: RoleRow; catalog: RoleCatalog; readOnly: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(role?.name ?? '');
  const [scope, setScope] = useState(role?.permissions[0]?.scope ?? 'org');
  const [selected, setSelected] = useState<Set<string>>(new Set((role?.permissions ?? []).map((p) => key(p.resource, p.action))));
  const [saving, setSaving] = useState(false);

  const actions = catalog.actions;
  const grantsAll = useMemo(() => new Set((role?.permissions ?? []).filter((p) => p.action === 'manage').map((p) => p.resource)), [role]);

  // Group the resources into the same sections users see in the sidebar.
  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        resources: catalog.resources.filter((r) => resGroup(r) === group),
      })).filter((g) => g.resources.length > 0),
    [catalog.resources],
  );

  function toggle(r: string, a: string) {
    if (readOnly) return;
    setSelected((s) => {
      const n = new Set(s);
      const k = key(r, a);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }
  function toggleRow(r: string) {
    if (readOnly) return;
    setSelected((s) => {
      const n = new Set(s);
      const allOn = actions.every((a) => n.has(key(r, a)));
      actions.forEach((a) => (allOn ? n.delete(key(r, a)) : n.add(key(r, a))));
      return n;
    });
  }

  async function save() {
    if (!name.trim()) return toast.error('Name is required');
    const permissions: RolePerm[] = [...selected].map((k) => {
      const [resource, action] = k.split(':');
      return { resource: resource!, action: action!, scope };
    });
    setSaving(true);
    const res = role ? await updateRole(role.id, { name, permissions }) : await createRole(name, permissions);
    setSaving(false);
    if (res.ok) { toast.success(role ? 'Role updated' : 'Role created'); onClose(); await onSaved(); } else toast.error(res.error ?? 'Failed');
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{readOnly ? `${role?.name} (system role)` : role ? 'Edit role' : 'New role'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div className="grid gap-1.5">
              <Label className="text-xs">Role name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} placeholder="e.g. Support Lead" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Data scope</Label>
              <Select items={catalog.scopes.map((s) => ({ value: s, label: humanize(s) }))} value={scope} onValueChange={(v) => setScope(v ?? 'org')} disabled={readOnly}>
                <SelectTrigger className="w-full capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catalog.scopes.map((s) => (<SelectItem key={s} value={s} className="capitalize">{humanize(s)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-h-[45vh] overflow-auto rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/60 backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Module</th>
                  {actions.map((a) => (
                    <th key={a} className="px-2 py-2 text-center text-[11px] font-semibold capitalize text-muted-foreground">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ group, resources }) => (
                  <Fragment key={group}>
                    <tr className="border-t border-border/40 bg-secondary/40">
                      <td colSpan={actions.length + 1} className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
                        {group}
                      </td>
                    </tr>
                    {resources.map((r) => (
                      <tr key={r} className="border-t border-border/40 hover:bg-secondary/20">
                        <td className="px-3 py-1.5">
                          <button
                            type="button"
                            onClick={() => toggleRow(r)}
                            disabled={readOnly}
                            title={RESOURCE_META[r]?.hint}
                            className="group/row flex flex-col text-left disabled:cursor-default"
                          >
                            <span className="text-xs font-medium text-foreground group-hover/row:text-primary">{resLabel(r)}</span>
                            {RESOURCE_META[r]?.hint && (
                              <span className="text-[10px] leading-tight text-muted-foreground/60">{RESOURCE_META[r]!.hint}</span>
                            )}
                          </button>
                        </td>
                        {actions.map((a) => {
                          const on = selected.has(key(r, a)) || (a !== 'manage' && grantsAll.has(r) && readOnly);
                          return (
                            <td key={a} className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => toggle(r, a)}
                                disabled={readOnly}
                                aria-pressed={on}
                                className={cn(
                                  'mx-auto grid size-5 place-items-center rounded border transition-colors',
                                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 hover:border-primary/50',
                                  readOnly && 'cursor-default',
                                )}
                              >
                                {on && <Check className="size-3.5" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Tick the actions this role can perform on each tool. Click a module name to toggle
            its whole row. <b className="font-semibold text-foreground">Manage</b> grants every
            action (incl. future ones). <b className="font-semibold text-foreground">Data scope</b>
            {' '}controls whose records they see — <i>Org</i> (everyone&apos;s), <i>Department</i>
            {' '}(their dept), or <i>Own</i> (only their own).
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && <Button onClick={save} loading={saving} disabled={!name.trim()}>Save role</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
