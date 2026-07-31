'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  UserPlus,
  Users,
  MailPlus,
  RotateCcw,
  Ban,
  Trash2,
  Crown,
  MoreHorizontal,
  Undo2,
  Mail,
  Download,
  UserCog,
  Loader2,
  IdCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  bulkInvite,
  cancelInvite,
  createUser,
  changeUserRole,
  createInvite,
  deleteUser,
  listInvitations,
  listUsers,
  reactivateUser,
  resendInvite,
  restoreUser,
  suspendUser,
  transferOwnership,
  getUserProfile,
  getUserProductivity,
  updateUserProfile,
  exportTeamExcel,
  exportTeamPdf,
  type Invitation,
  type TeamUser,
  type EmployeeProfile,
  type Productivity,
} from '@/lib/team-actions';
import { getStructure, type DepartmentRow, type TeamRow } from '@/lib/structure-actions';
import { UserAvatar } from '@/components/user-avatar';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'hr', label: 'HR' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Employee' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400',
  suspended: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400',
  deleted: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300',
};


export function TeamManager({
  meId,
  meIsOwner,
  canManage,
  initialUsers,
  initialInvites,
  roles,
}: {
  meId: string;
  meIsOwner: boolean;
  canManage: boolean;
  initialUsers: TeamUser[];
  initialInvites: Invitation[];
  roles: { id: string; name: string; key: string }[];
}) {
  const [users, setUsers] = useState<TeamUser[]>(initialUsers);
  const [invites, setInvites] = useState<Invitation[]>(initialInvites);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => Promise<void> } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const assignableRoles = roles.filter((r) => r.key !== 'owner');

  function download(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCsv() {
    const rows = [
      ['Name', 'Email', 'Role', 'Department', 'Status'],
      ...users.map((u) => [u.fullName, u.email, u.roleName, u.department ?? '', u.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    download(URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), 'team.csv');
  }
  function b64Download(base64: string, mime: string, filename: string) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    download(URL.createObjectURL(new Blob([bytes], { type: mime })), filename);
  }
  async function exportExcel() {
    const res = await exportTeamExcel();
    if (res.ok && res.base64) b64Download(res.base64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'team.xlsx');
    else toast.error(res.error ?? 'Export failed');
  }
  async function exportPdf() {
    const res = await exportTeamPdf();
    if (res.ok && res.base64) b64Download(res.base64, 'application/pdf', 'team.pdf');
    else toast.error(res.error ?? 'Export failed');
  }

  const refresh = useCallback(async () => {
    const [u, i] = await Promise.all([listUsers(), listInvitations()]);
    setUsers(u);
    setInvites(i);
  }, []);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    const res = await fn();
    if (res.ok) {
      toast.success(ok);
      await refresh();
    } else {
      toast.error(res.error ?? 'Failed');
    }
  }

  const pending = invites.filter((i) => i.status === 'pending');

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team</h1>
            <p className="text-sm text-muted-foreground">
              {users.filter((u) => u.status !== 'deleted').length} members
              {pending.length > 0 && ` · ${pending.length} pending`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm"><Download className="size-4" />Export</Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv}>CSV (.csv)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>PDF (.pdf)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              Create Users
            </Button>
          )}
        </div>
      </div>

      {/* Pending invitations */}
      {canManage && pending.length > 0 && (
        <Card className="rounded-2xl border-0 p-4 shadow-sm ring-1 ring-border/50">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Mail className="size-4 text-muted-foreground" />
            Pending invitations
          </h2>
          <ul className="flex flex-col divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {pending.map((inv) => (
                <motion.li key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                    <Mail className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.roleName} · invited by {inv.invitedByName ?? '—'}
                      {inv.expired && <span className="ml-1 text-rose-500">· expired</span>}
                    </p>
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => run(() => resendInvite(inv.id), 'Invitation resent')}>
                    Resend
                  </Button>
                  <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-rose-500" onClick={() => run(() => cancelInvite(inv.id), 'Invitation cancelled')}>
                    Cancel
                  </Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Card>
      )}

      {/* Members */}
      <Card className="overflow-hidden rounded-2xl border-0 p-2 shadow-sm ring-1 ring-border/50">
        <ul className="flex flex-col">
          {users.map((u) => {
            const isSelf = u.id === meId;
            const isDeleted = u.status === 'deleted';
            const canEditRole = canManage && !isSelf && !u.isOwner && !isDeleted;
            const showActions = canManage && !isSelf && !u.isOwner;
            return (
              <li key={u.id} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/40', isDeleted && 'opacity-60')}>
                <UserAvatar userId={u.id} name={u.fullName || u.email} hasAvatar={u.hasAvatar} className="size-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{u.fullName || '—'}</span>
                    {u.isOwner && (
                      <Badge variant="outline" className="gap-0.5 border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                        <Crown className="size-3" /> Owner
                      </Badge>
                    )}
                    {isSelf && <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary">You</span>}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">{u.email}{u.department ? ` · ${u.department}` : ''}</span>
                </div>

                {canEditRole && u.roleId ? (
                  <Select items={assignableRoles.map((r) => ({ value: r.id, label: r.name }))} value={u.roleId} onValueChange={(v) => v && v !== u.roleId && run(() => changeUserRole(u.id, v), 'Role updated')}>
                    <SelectTrigger size="sm" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{u.roleName}</Badge>
                )}

                <Badge variant="outline" className={cn('capitalize', STATUS_STYLE[u.status] ?? STATUS_STYLE.inactive)}>{u.status}</Badge>

                {showActions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>} />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setProfileId(u.id)}>
                        <UserCog className="size-4" /> Manage profile
                      </DropdownMenuItem>
                      {isDeleted ? (
                        <DropdownMenuItem onClick={() => run(() => restoreUser(u.id), 'Member restored')}>
                          <Undo2 className="size-4" /> Restore
                        </DropdownMenuItem>
                      ) : (
                        <>
                          {u.status === 'suspended' ? (
                            <DropdownMenuItem onClick={() => run(() => reactivateUser(u.id), 'Reactivated')}>
                              <RotateCcw className="size-4" /> Reactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => run(() => suspendUser(u.id), 'Suspended')}>
                              <Ban className="size-4" /> Suspend
                            </DropdownMenuItem>
                          )}
                          {meIsOwner && u.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirm({
                                  title: 'Transfer ownership?',
                                  body: `${u.fullName || u.email} will become the workspace Owner and you will become an Admin. This cannot be undone by you afterwards.`,
                                  run: async () => run(() => transferOwnership(u.id), 'Ownership transferred'),
                                })
                              }
                            >
                              <Crown className="size-4" /> Transfer ownership
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-rose-500"
                            onClick={() =>
                              setConfirm({
                                title: 'Delete member?',
                                body: `${u.fullName || u.email} will lose access immediately. You can restore them later.`,
                                run: async () => run(() => deleteUser(u.id), 'Member deleted'),
                              })
                            }
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="w-8" />
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onDone={refresh} />

      {profileId && (
        <ProfileDialog
          userId={profileId}
          canEdit={canManage}
          members={users.filter((u) => u.status !== 'deleted').map((u) => ({ id: u.id, fullName: u.fullName }))}
          onClose={() => setProfileId(null)}
          onSaved={refresh}
        />
      )}

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirm?.body}</p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              loading={confirmBusy}
              onClick={async () => {
                if (!confirm) return;
                setConfirmBusy(true);
                await confirm.run();
                setConfirmBusy(false);
                setConfirm(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => Promise<void> }) {
  const [mode, setMode] = useState<'single' | 'bulk' | 'create'>('single');
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [roleKey, setRoleKey] = useState('member');
  const [departmentId, setDepartmentId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getStructure().then((s) => {
      setDepartments(s.departments);
      setTeams(s.teams);
    });
  }, [open]);

  async function submit() {
    setSaving(true);
    if (mode === 'create') {
      if (password.length < 8) {
        setSaving(false);
        return toast.error('Password must be at least 8 characters');
      }
      const res = await createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        roleKey,
        departmentId: departmentId || undefined,
        teamId: teamId || undefined,
      });
      setSaving(false);
      if (res.ok) {
        toast.success('User created — share the login details securely');
        setFullName('');
        setEmail('');
        setPassword('');
        onOpenChange(false);
        await onDone();
      } else toast.error(res.error ?? 'Could not create user');
    } else if (mode === 'single') {
      const res = await createInvite(email.trim(), roleKey, {
        departmentId: departmentId || undefined,
        teamId: teamId || undefined,
      });
      setSaving(false);
      if (res.ok) {
        toast.success('Invitation sent');
        setEmail('');
        onOpenChange(false);
        await onDone();
      } else toast.error(res.error ?? 'Could not invite');
    } else {
      const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
      if (list.length === 0) {
        setSaving(false);
        return toast.error('Add at least one email');
      }
      const res = await bulkInvite(list, roleKey);
      setSaving(false);
      if (res.ok) {
        toast.success(`${res.created} invited${res.skipped && res.skipped.length ? `, ${res.skipped.length} skipped` : ''}`);
        setEmails('');
        onOpenChange(false);
        await onDone();
      } else toast.error(res.error ?? 'Bulk invite failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MailPlus className="size-4" /> Add people</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1 rounded-lg bg-secondary/40 p-1 ring-1 ring-border/50">
            {(['single', 'bulk', 'create'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer', mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
              >
                {m === 'single' ? 'Invite' : m === 'bulk' ? 'Bulk (CSV)' : 'Create directly'}
              </button>
            ))}
          </div>

          {mode === 'bulk' ? (
            <div className="grid gap-2">
              <Label htmlFor="inv-emails">Emails (comma, space or newline separated)</Label>
              <Textarea id="inv-emails" value={emails} onChange={(e) => setEmails(e.target.value)} rows={4} placeholder="a@co.com, b@co.com …" />
            </div>
          ) : (
            <>
              {mode === 'create' && (
                <div className="grid gap-2">
                  <Label htmlFor="inv-name">Full name</Label>
                  <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" autoFocus />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="inv-email">Email</Label>
                <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" autoFocus={mode === 'single'} />
              </div>
              {mode === 'create' && (
                <div className="grid gap-2">
                  <Label htmlFor="inv-pass">Temporary password</Label>
                  <Input id="inv-pass" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                  <p className="text-[11px] text-muted-foreground">Share this with the user securely. They can change it from Settings → Security after signing in.</p>
                </div>
              )}
            </>
          )}

          <div className="grid gap-2">
            <Label>Role</Label>
            <Select items={ROLES} value={roleKey} onValueChange={(v) => setRoleKey(v ?? 'member')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode !== 'bulk' && (departments.length > 0 || teams.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {departments.length > 0 && (
                <InvitePicker label="Department" value={departmentId} onChange={setDepartmentId} placeholder="None" options={departments.map((d) => ({ value: d.id, label: d.name }))} />
              )}
              {teams.length > 0 && (
                <InvitePicker label="Team" value={teamId} onChange={setTeamId} placeholder="None" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={submit}
            loading={saving}
            disabled={
              mode === 'bulk'
                ? !emails.trim()
                : mode === 'create'
                  ? !fullName.trim() || !email.trim() || !password
                  : !email.trim()
            }
          >
            {mode === 'create' ? 'Create user' : mode === 'bulk' ? 'Send invitations' : 'Send invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({
  userId,
  canEdit,
  members,
  onClose,
  onSaved,
}: {
  userId: string;
  canEdit: boolean;
  members: { id: string; fullName: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [prod, setProd] = useState<Productivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [managerId, setManagerId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getUserProfile(userId), getUserProductivity(userId)]).then(([p, pr]) => {
      if (p) {
        setProfile(p);
        setDesignation(p.designation ?? '');
        setEmployeeId(p.employeeId ?? '');
        setJoiningDate(p.joiningDate ? p.joiningDate.slice(0, 10) : '');
        setManagerId(p.reportingManagerId ?? '');
      }
      setProd(pr);
      setLoading(false);
    });
  }, [userId]);

  async function save() {
    setSaving(true);
    const res = await updateUserProfile(userId, {
      designation: designation || null,
      employeeId: employeeId || null,
      joiningDate: joiningDate || null,
      reportingManagerId: managerId || null,
    });
    setSaving(false);
    if (res.ok) { toast.success('Profile updated'); onClose(); await onSaved(); } else toast.error(res.error ?? 'Failed');
  }

  const managerOptions = [{ value: '', label: 'None' }, ...members.filter((m) => m.id !== userId).map((m) => ({ value: m.id, label: m.fullName }))];

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><IdCard className="size-4" /> Employee profile</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
        ) : !profile ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Could not load profile.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar userId={userId} name={profile.fullName || profile.email} hasAvatar={profile.hasAvatar} className="size-11 text-sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{profile.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email} · {profile.roleName}</p>
              </div>
            </div>

            {prod && (
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Tasks" value={prod.tasksTotal} />
                <Stat label="Done" value={prod.tasksDone} className="text-emerald-600 dark:text-emerald-400" />
                <Stat label="Overdue" value={prod.tasksOverdue} className={prod.tasksOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
                <Stat label="Completion" value={`${prod.completionRate}%`} />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label className="text-xs">Designation</Label><Input value={designation} onChange={(e) => setDesignation(e.target.value)} disabled={!canEdit} placeholder="e.g. Senior SEO Analyst" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Employee ID</Label><Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!canEdit} placeholder="EMP-001" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Joining date</Label><Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} disabled={!canEdit} /></div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Reporting manager</Label>
                <Select items={managerOptions} value={managerId} onValueChange={(v) => setManagerId(v ?? '')} disabled={!canEdit}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {managerOptions.map((o) => (<SelectItem key={o.value || 'none'} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Department:</span> {profile.department?.name ?? '—'} ·{' '}
              <span className="font-medium text-foreground">Office:</span> {profile.office?.name ?? '—'} ·{' '}
              <span className="font-medium text-foreground">Teams:</span> {profile.teams.length ? profile.teams.map((t) => t.name).join(', ') : '—'}
              <span className="mt-0.5 block text-[11px]">Manage department / office / teams in Structure.</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canEdit && profile && <Button onClick={save} loading={saving}>Save profile</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-2 text-center">
      <p className={cn('text-lg font-bold text-foreground', className)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function InvitePicker({ label, value, onChange, placeholder, options }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[] }) {
  const items = [{ value: '', label: placeholder }, ...options];
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select items={items} value={value} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value || 'none'} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
