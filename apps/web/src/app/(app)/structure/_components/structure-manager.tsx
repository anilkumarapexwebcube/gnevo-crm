'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Network,
  GitBranch,
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  X,
  UserPlus,
  Crown,
  Clock,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
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
  getStructure,
  createOffice,
  updateOffice,
  deleteOffice,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  type StructureOverview,
  type OfficeRow,
  type DepartmentRow,
  type TeamRow,
  getDepartmentAnalytics,
  type StructureMember,
  type DepartmentAnalytics,
} from '@/lib/structure-actions';
import { OrgChart } from './org-chart';

type Tab = 'offices' | 'departments' | 'teams';
type Mode = 'chart' | 'manage';
const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: 'offices', label: 'Offices', icon: Building2 },
  { key: 'departments', label: 'Departments', icon: Network },
  { key: 'teams', label: 'Teams', icon: UsersRound },
];

export function StructureManager({ canManage, initial }: { canManage: boolean; initial: StructureOverview }) {
  const [data, setData] = useState(initial);
  const [mode, setMode] = useState<Mode>('chart');
  const [tab, setTab] = useState<Tab>('offices');
  const [dialog, setDialog] = useState<null | { kind: Tab; editing?: OfficeRow | DepartmentRow | TeamRow }>(null);
  const [analytics, setAnalytics] = useState<DepartmentAnalytics | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const refresh = useCallback(async () => setData(await getStructure()), []);

  async function openAnalytics(id: string) {
    setAnalyticsOpen(true);
    setAnalytics(null);
    setAnalytics(await getDepartmentAnalytics(id));
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    const res = await fn();
    if (res.ok) {
      toast.success(ok);
      await refresh();
    } else toast.error(res.error ?? 'Failed');
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization structure</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'chart' ? 'Reporting hierarchy — Owner at the top, teams below.' : 'Offices, departments & teams — and who manages them.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-secondary/40 p-1 ring-1 ring-border/50">
            {(['chart', 'manage'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  mode === m ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'chart' ? <GitBranch className="size-4" /> : <Network className="size-4" />}
                {m === 'chart' ? 'Org chart' : 'Manage'}
              </button>
            ))}
          </div>
          {canManage && mode === 'manage' && (
            <Button size="sm" onClick={() => setDialog({ kind: tab })}>
              <Plus className="size-4" />
              New {tab.slice(0, -1)}
            </Button>
          )}
        </div>
      </div>

      {mode === 'chart' && <OrgChart members={data.members} />}

      {mode === 'manage' && (
        <div className="flex w-fit items-center gap-1 rounded-xl bg-secondary/40 p-1 ring-1 ring-border/50">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                tab === t.key ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="size-4" />
              {t.label}
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">{data[t.key].length}</span>
            </button>
          ))}
        </div>
      )}

      {mode === 'manage' && (
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="flex flex-col gap-3">
          {tab === 'offices' &&
            (data.offices.length === 0 ? (
              <Empty label="offices" />
            ) : (
              data.offices.map((o) => (
                <Row key={o.id} title={o.name} onEdit={canManage ? () => setDialog({ kind: 'offices', editing: o }) : undefined} onDelete={canManage ? () => run(() => deleteOffice(o.id), 'Office deleted') : undefined}>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" />{o.timezone}</span>
                  <span>· {o.departmentCount} departments</span>
                  <span>· {o.memberCount} people</span>
                </Row>
              ))
            ))}

          {tab === 'departments' &&
            (data.departments.length === 0 ? (
              <Empty label="departments" />
            ) : (
              data.departments.map((d) => (
                <Row
                  key={d.id}
                  title={d.name}
                  onView={() => openAnalytics(d.id)}
                  onEdit={canManage ? () => setDialog({ kind: 'departments', editing: d }) : undefined}
                  onDelete={canManage ? () => run(() => deleteDepartment(d.id), 'Department deleted') : undefined}
                >
                  {d.officeName && <span>{d.officeName}</span>}
                  {d.managerName && <span className="inline-flex items-center gap-1 text-primary"><Crown className="size-3" />{d.managerName}</span>}
                  <span>· {d.memberCount} people</span>
                </Row>
              ))
            ))}

          {tab === 'teams' &&
            (data.teams.length === 0 ? (
              <Empty label="teams" />
            ) : (
              data.teams.map((t) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  members={data.members}
                  canManage={canManage}
                  onEdit={() => setDialog({ kind: 'teams', editing: t })}
                  onDelete={() => run(() => deleteTeam(t.id), 'Team deleted')}
                  onAddMember={(uid) => run(() => addTeamMember(t.id, uid), 'Member added')}
                  onRemoveMember={(uid) => run(() => removeTeamMember(t.id, uid), 'Member removed')}
                />
              ))
            ))}
        </motion.div>
      </AnimatePresence>
      )}

      {dialog?.kind === 'offices' && (
        <OfficeDialog editing={dialog.editing as OfficeRow | undefined} onClose={() => setDialog(null)} onSaved={refresh} />
      )}
      {dialog?.kind === 'departments' && (
        <DepartmentDialog editing={dialog.editing as DepartmentRow | undefined} offices={data.offices} members={data.members} onClose={() => setDialog(null)} onSaved={refresh} />
      )}
      {dialog?.kind === 'teams' && (
        <TeamDialog editing={dialog.editing as TeamRow | undefined} departments={data.departments} members={data.members} onClose={() => setDialog(null)} onSaved={refresh} />
      )}

      <Dialog open={analyticsOpen} onOpenChange={(v) => !v && setAnalyticsOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-primary" />{analytics ? `${analytics.name} · dashboard` : 'Department dashboard'}</DialogTitle>
          </DialogHeader>
          {!analytics ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {analytics.office && <span>Office: <span className="text-foreground">{analytics.office}</span></span>}
                {analytics.managerName && <span className="inline-flex items-center gap-1 text-primary"><Crown className="size-3" />{analytics.managerName}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat label="People" value={analytics.memberCount} />
                <MiniStat label="Teams" value={analytics.teamCount} />
                <MiniStat label="Tasks done" value={`${analytics.tasks.done}/${analytics.tasks.total}`} />
                <MiniStat label="Completion" value={`${analytics.tasks.completion}%`} className="text-primary" />
              </div>
              {analytics.tasks.overdue > 0 && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{analytics.tasks.overdue} overdue task{analytics.tasks.overdue === 1 ? '' : 's'} in this department.</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
                  {analytics.members.length === 0 ? <p className="text-xs text-muted-foreground">No members.</p> : (
                    <ul className="flex flex-col divide-y divide-border/30">
                      {analytics.members.map((m) => (
                        <li key={m.id} className="flex items-center justify-between py-1.5 text-sm"><span className="truncate">{m.name}</span><span className="text-xs text-muted-foreground">{m.role}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teams</p>
                  {analytics.teams.length === 0 ? <p className="text-xs text-muted-foreground">No teams.</p> : (
                    <ul className="flex flex-col divide-y divide-border/30">
                      {analytics.teams.map((t) => (
                        <li key={t.id} className="flex items-center justify-between py-1.5 text-sm"><span className="truncate">{t.name}</span><span className="text-xs text-muted-foreground">{t.members} member{t.members === 1 ? '' : 's'}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
      <p className={cn('text-lg font-bold text-foreground', className)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ title, children, onView, onEdit, onDelete }: { title: string; children: React.ReactNode; onView?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">{children}</div>
      </div>
      <div className="flex items-center gap-0.5">
        {onView && (
          <Button variant="ghost" size="icon-sm" onClick={onView} aria-label="Dashboard" title="Department dashboard"><BarChart3 className="size-4" /></Button>
        )}
        {onEdit && (
          <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit"><Pencil className="size-4" /></Button>
            {onDelete && <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-rose-500" onClick={onDelete} aria-label="Delete"><Trash2 className="size-4" /></Button>}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function TeamCard({
  team,
  members,
  canManage,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}: {
  team: TeamRow;
  members: StructureMember[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
}) {
  const inTeam = new Set(team.members.map((m) => m.id));
  const available = members.filter((m) => !inTeam.has(m.id));
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {team.departmentName && <span>{team.departmentName}</span>}
            {team.managerName && <span className="inline-flex items-center gap-1 text-primary"><Crown className="size-3" />{team.managerName}</span>}
            <span>· {team.members.length} members</span>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit"><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-rose-500" onClick={onDelete} aria-label="Delete"><Trash2 className="size-4" /></Button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {team.members.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-secondary/60 py-0.5 pl-2 pr-1 text-xs">
            {m.name}
            {canManage && (
              <button onClick={() => onRemoveMember(m.id)} className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20" aria-label={`Remove ${m.name}`}>
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {canManage && available.length > 0 && (
          <Select items={available.map((m) => ({ value: m.id, label: m.fullName }))} value="" onValueChange={(v) => v && onAddMember(v)}>
            <SelectTrigger size="sm" className="h-7 w-auto gap-1 rounded-full border-dashed text-xs">
              <UserPlus className="size-3" />
              <span>Add</span>
            </SelectTrigger>
            <SelectContent>
              {available.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </motion.div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <Card className="flex flex-col items-center gap-2 rounded-2xl border-0 py-12 text-center ring-1 ring-border/50">
      <Network className="size-7 text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">No {label} yet</p>
      <p className="text-xs text-muted-foreground">Create one to organize your workspace.</p>
    </Card>
  );
}

/* ── Dialogs ── */

function OfficeDialog({ editing, onClose, onSaved }: { editing?: OfficeRow; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [timezone, setTimezone] = useState(editing?.timezone ?? 'UTC');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const res = editing ? await updateOffice(editing.id, { name, timezone }) : await createOffice(name, timezone);
    setSaving(false);
    if (res.ok) { toast.success(editing ? 'Office updated' : 'Office created'); onClose(); await onSaved(); } else toast.error(res.error ?? 'Failed');
  }
  return (
    <FormDialog title={editing ? 'Edit office' : 'New office'} onClose={onClose} onSave={save} saving={saving} disabled={!name.trim()}>
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Head Office" autoFocus /></Field>
      <Field label="Timezone"><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC / Asia/Kolkata" /></Field>
    </FormDialog>
  );
}

function DepartmentDialog({ editing, offices, members, onClose, onSaved }: { editing?: DepartmentRow; offices: OfficeRow[]; members: StructureMember[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [officeId, setOfficeId] = useState(editing?.officeId ?? '');
  const [managerId, setManagerId] = useState(editing?.managerId ?? '');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const body = { name, officeId: officeId || null, managerId: managerId || null };
    const res = editing ? await updateDepartment(editing.id, body) : await createDepartment({ name, officeId: officeId || undefined, managerId: managerId || undefined });
    setSaving(false);
    if (res.ok) { toast.success(editing ? 'Department updated' : 'Department created'); onClose(); await onSaved(); } else toast.error(res.error ?? 'Failed');
  }
  return (
    <FormDialog title={editing ? 'Edit department' : 'New department'} onClose={onClose} onSave={save} saving={saving} disabled={!name.trim()}>
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales" autoFocus /></Field>
      <PickerField label="Office" value={officeId} onChange={setOfficeId} placeholder="No office" options={offices.map((o) => ({ value: o.id, label: o.name }))} />
      <PickerField label="Manager" value={managerId} onChange={setManagerId} placeholder="No manager" options={members.map((m) => ({ value: m.id, label: m.fullName }))} />
    </FormDialog>
  );
}

function TeamDialog({ editing, departments, members, onClose, onSaved }: { editing?: TeamRow; departments: DepartmentRow[]; members: StructureMember[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [departmentId, setDepartmentId] = useState(editing?.departmentId ?? '');
  const [managerId, setManagerId] = useState(editing?.managerId ?? '');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const body = { name, departmentId: departmentId || null, managerId: managerId || null };
    const res = editing ? await updateTeam(editing.id, body) : await createTeam({ name, departmentId: departmentId || undefined, managerId: managerId || undefined });
    setSaving(false);
    if (res.ok) { toast.success(editing ? 'Team updated' : 'Team created'); onClose(); await onSaved(); } else toast.error(res.error ?? 'Failed');
  }
  return (
    <FormDialog title={editing ? 'Edit team' : 'New team'} onClose={onClose} onSave={save} saving={saving} disabled={!name.trim()}>
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Outbound Squad" autoFocus /></Field>
      <PickerField label="Department" value={departmentId} onChange={setDepartmentId} placeholder="No department" options={departments.map((d) => ({ value: d.id, label: d.name }))} />
      <PickerField label="Team lead" value={managerId} onChange={setManagerId} placeholder="No lead" options={members.map((m) => ({ value: m.id, label: m.fullName }))} />
    </FormDialog>
  );
}

function FormDialog({ title, children, onClose, onSave, saving, disabled }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving: boolean; disabled: boolean }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} loading={saving} disabled={disabled}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function PickerField({ label, value, onChange, placeholder, options }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[] }) {
  const items = [{ value: '', label: placeholder }, ...options];
  return (
    <Field label={label}>
      <Select items={items} value={value} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value || 'none'} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
