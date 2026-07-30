'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CalendarCheck,
  Plane,
  PartyPopper,
  LogIn,
  LogOut,
  Check,
  X,
  Plus,
  Trash2,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  clockIn,
  clockOut,
  submitLeave,
  decideLeave,
  cancelLeave,
  createHoliday,
  deleteHoliday,
  clearLoginHistory,
  clearAttendanceHistory,
  type Attendance,
  type LeaveRequest,
  type Holiday,
  type HrAnalytics,
  type LoginEntry,
  type AttendanceEntry,
} from '@/lib/hr-actions';

type Tab = 'attendance' | 'leave' | 'holidays' | 'analytics' | 'reports';
const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual' },
  { value: 'sick', label: 'Sick' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'wfh', label: 'Work from home' },
];
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400',
  present: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400',
};
// Deterministic formatters (manual) so server + client render identically (no
// locale AM/am ICU differences → no hydration mismatch).
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WK_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const time = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
};
const day = (iso: string) => {
  const d = new Date(iso);
  return `${WK[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
};
const fullDay = (iso: string) => {
  const d = new Date(iso);
  return `${MON_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
const longToday = () => {
  const d = new Date();
  return `${WK_LONG[d.getDay()]}, ${MON_LONG[d.getMonth()]} ${d.getDate()}`;
};
const dateTime = (iso: string) => {
  const d = new Date(iso);
  return `${MON[d.getMonth()]} ${d.getDate()}, ${time(iso)}`;
};

export function HrManager({
  canManage,
  initialToday,
  attendance,
  myLeaves,
  allLeaves,
  holidays,
  analytics,
  logins,
  attendanceLog,
}: {
  canManage: boolean;
  initialToday: Attendance | null;
  attendance: Attendance[];
  myLeaves: LeaveRequest[];
  allLeaves: LeaveRequest[];
  holidays: Holiday[];
  analytics: HrAnalytics | null;
  logins: LoginEntry[];
  attendanceLog: AttendanceEntry[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('attendance');
  const [pending, startTransition] = useTransition();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => Promise<{ ok: boolean; error?: string }> } | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(ok);
        router.refresh();
      } else toast.error(res.error ?? 'Failed');
    });
  }

  const pendingApprovals = allLeaves.filter((l) => l.status === 'pending');
  const TABS: { key: Tab; label: string; icon: typeof Clock; badge?: number }[] = [
    { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { key: 'leave', label: 'Leave', icon: Plane, badge: canManage ? pendingApprovals.length : undefined },
    { key: 'holidays', label: 'Holidays', icon: PartyPopper },
    ...(canManage ? [{ key: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 }] : []),
    ...(canManage ? [{ key: 'reports' as Tab, label: 'Reports', icon: CalendarDays }] : []),
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HR &amp; Workplace</h1>
        <p className="text-sm text-muted-foreground">Attendance, leave requests &amp; company holidays.</p>
      </div>

      <div className="flex w-fit items-center gap-1 rounded-xl bg-secondary/40 p-1 ring-1 ring-border/50">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="size-4" />
            {t.label}
            {t.badge ? <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="flex flex-col gap-4">
          {tab === 'attendance' && (
            <>
              <Card className="rounded-2xl p-6 shadow-sm ring-1 ring-border/50">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn('grid size-12 place-items-center rounded-2xl', initialToday?.checkIn ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-secondary text-muted-foreground')}>
                      <Clock className="size-6" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {!initialToday?.checkIn ? "You haven't clocked in today" : initialToday.checkOut ? 'Shift complete' : 'Clocked in'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {initialToday?.checkIn ? `In ${time(initialToday.checkIn)}` : longToday()}
                        {initialToday?.checkOut ? ` · Out ${time(initialToday.checkOut)}` : ''}
                      </p>
                    </div>
                  </div>
                  {!initialToday?.checkIn ? (
                    <Button onClick={() => run(clockIn, 'Clocked in')} loading={pending}><LogIn className="size-4" />Clock in</Button>
                  ) : !initialToday.checkOut ? (
                    <Button variant="outline" onClick={() => run(clockOut, 'Clocked out')} loading={pending}><LogOut className="size-4" />Clock out</Button>
                  ) : (
                    <Badge variant="outline" className={STATUS_STYLE.present}>Present</Badge>
                  )}
                </div>
              </Card>

              <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
                <h2 className="mb-2 px-2 text-sm font-semibold">Recent attendance</h2>
                {attendance.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No attendance recorded yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border/40">
                    {attendance.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 px-2 py-2.5 text-sm">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        <span className="w-32 font-medium text-foreground">{day(a.date)}</span>
                        <span className="text-muted-foreground">In {time(a.checkIn)}</span>
                        <span className="text-muted-foreground">Out {time(a.checkOut)}</span>
                        <Badge variant="outline" className={cn('ml-auto capitalize', STATUS_STYLE[a.status] ?? '')}>{a.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {tab === 'leave' && (
            <>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setLeaveOpen(true)}><Plus className="size-4" />Request leave</Button>
              </div>

              {canManage && pendingApprovals.length > 0 && (
                <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
                  <h2 className="mb-2 px-1 text-sm font-semibold">Pending approvals</h2>
                  <ul className="flex flex-col gap-2">
                    {pendingApprovals.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{l.userName} · <span className="capitalize">{l.type}</span></p>
                          <p className="text-xs text-muted-foreground">{fullDay(l.startDate)} → {fullDay(l.endDate)}{l.reason ? ` · ${l.reason}` : ''}</p>
                        </div>
                        <Button size="xs" variant="outline" className="text-emerald-600" onClick={() => run(() => decideLeave(l.id, 'approved'), 'Approved')}><Check className="size-3.5" />Approve</Button>
                        <Button size="xs" variant="outline" className="text-rose-500" onClick={() => run(() => decideLeave(l.id, 'rejected'), 'Rejected')}><X className="size-3.5" />Reject</Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
                <h2 className="mb-2 px-1 text-sm font-semibold">My requests</h2>
                {myLeaves.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No leave requests yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border/40">
                    {myLeaves.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium capitalize text-foreground">{l.type}</p>
                          <p className="text-xs text-muted-foreground">{fullDay(l.startDate)} → {fullDay(l.endDate)}{l.reviewedByName ? ` · by ${l.reviewedByName}` : ''}</p>
                        </div>
                        <Badge variant="outline" className={cn('capitalize', STATUS_STYLE[l.status] ?? '')}>{l.status}</Badge>
                        {l.status === 'pending' && (
                          <Button size="xs" variant="ghost" className="text-muted-foreground hover:text-rose-500" onClick={() => run(() => cancelLeave(l.id), 'Cancelled')}>Cancel</Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {tab === 'holidays' && (
            <HolidaysPanel holidays={holidays} canManage={canManage} onAdd={(n, d) => run(() => createHoliday(n, d), 'Holiday added')} onDelete={(id) => run(() => deleteHoliday(id), 'Holiday removed')} />
          )}

          {tab === 'analytics' && analytics && <AnalyticsPanel a={analytics} />}

          {tab === 'reports' && (
            <ReportsPanel
              logins={logins}
              attendanceLog={attendanceLog}
              onClearLogins={() => setConfirm({ title: 'Clear sign-in history?', body: 'This permanently removes all recorded sign-in events. This cannot be undone.', run: clearLoginHistory })}
              onClearAttendance={() => setConfirm({ title: 'Clear attendance log?', body: 'This permanently deletes all attendance records for every employee. This cannot be undone.', run: clearAttendanceHistory })}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <LeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} onSubmit={(input) => run(() => submitLeave(input), 'Leave requested')} />

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{confirm?.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{confirm?.body}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-600/90"
              loading={pending}
              onClick={() => {
                if (!confirm) return;
                const fn = confirm.run;
                setConfirm(null);
                run(fn, 'Cleared');
              }}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportsPanel({
  logins,
  attendanceLog,
  onClearLogins,
  onClearAttendance,
}: {
  logins: LoginEntry[];
  attendanceLog: AttendanceEntry[];
  onClearLogins: () => void;
  onClearAttendance: () => void;
}) {
  const dt = (iso: string) => dateTime(iso);
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold">Recent sign-ins</h3>
          {logins.length > 0 && (
            <Button variant="outline" size="xs" className="text-muted-foreground hover:text-rose-500" onClick={onClearLogins}>
              <Trash2 className="size-3.5" />Clear
            </Button>
          )}
        </div>
        {logins.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No sign-in history yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/40">
            {logins.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="w-40 font-medium text-foreground">{l.userName}</span>
                <span className="text-xs text-muted-foreground">{l.ip ?? '—'}</span>
                <span className="ml-auto text-xs text-muted-foreground">{dt(l.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold">Attendance log (all employees)</h3>
          {attendanceLog.length > 0 && (
            <Button variant="outline" size="xs" className="text-muted-foreground hover:text-rose-500" onClick={onClearAttendance}>
              <Trash2 className="size-3.5" />Clear
            </Button>
          )}
        </div>
        {attendanceLog.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No attendance recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/40">
            {attendanceLog.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="w-40 font-medium text-foreground">{a.userName}</span>
                <span className="w-28 text-muted-foreground">{day(a.date)}</span>
                <span className="text-xs text-muted-foreground">In {time(a.checkIn)} · Out {time(a.checkOut)}</span>
                <Badge variant="outline" className={cn('ml-auto capitalize', STATUS_STYLE[a.status] ?? '')}>{a.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AnalyticsPanel({ a }: { a: HrAnalytics }) {
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#94a3b8', '#f59e0b'];
  const tip = { borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)' };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Headcount" value={a.headcount} />
        <Kpi label="Present today" value={a.presentToday} className="text-emerald-600 dark:text-emerald-400" />
        <Kpi label="Attendance" value={`${a.attendanceRate}%`} className="text-primary" />
        <Kpi label="Pending leaves" value={a.pendingLeaves} className={a.pendingLeaves > 0 ? 'text-amber-600 dark:text-amber-400' : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
          <h3 className="mb-2 text-sm font-semibold">Headcount by role</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.byRole} layout="vertical" margin={{ left: 16, right: 12 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis type="category" dataKey="key" width={80} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {a.byRole.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
          <h3 className="mb-2 text-sm font-semibold">Headcount by department</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.byDepartment} margin={{ left: -12, right: 8 }}>
                <XAxis dataKey="key" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
        <h3 className="mb-3 text-sm font-semibold">Leave requests</h3>
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Pending" value={a.leaves.pending} className="text-amber-600 dark:text-amber-400" />
          <Kpi label="Approved" value={a.leaves.approved} className="text-emerald-600 dark:text-emerald-400" />
          <Kpi label="Rejected" value={a.leaves.rejected} className="text-rose-600 dark:text-rose-400" />
        </div>
      </Card>

      <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold">Working hours this month</h3>
          <span className="text-xs text-muted-foreground">{a.totalHours}h total</span>
        </div>
        {a.workingHours.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No clocked hours yet this month.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/40">
            {a.workingHours.map((w) => (
              <li key={w.name} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1 font-medium text-foreground">{w.name}</span>
                <span className="text-xs text-muted-foreground">{w.days} day{w.days === 1 ? '' : 's'}</span>
                <span className="w-16 text-right font-semibold text-foreground">{w.hours}h</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 text-center shadow-sm">
      <p className={cn('text-2xl font-bold text-foreground', className)}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function HolidaysPanel({ holidays, canManage, onAdd, onDelete }: { holidays: Holiday[]; canManage: boolean; onAdd: (name: string, date: string) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const todayStr = new Date().toISOString().slice(0, 10);
  return (
    <Card className="rounded-2xl p-4 shadow-sm ring-1 ring-border/50">
      {canManage && (
        <div className="mb-3 flex flex-wrap items-end gap-2 border-b border-border/40 pb-3">
          <div className="grid flex-1 gap-1.5"><Label className="text-xs">Holiday name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <Button size="sm" disabled={!name.trim() || !date} onClick={() => { onAdd(name.trim(), date); setName(''); setDate(''); }}><Plus className="size-4" />Add</Button>
        </div>
      )}
      {holidays.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No holidays added yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40">
          {holidays.map((h) => {
            const upcoming = h.date.slice(0, 10) >= todayStr;
            return (
              <li key={h.id} className={cn('group flex items-center gap-3 py-2.5', !upcoming && 'opacity-60')}>
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><PartyPopper className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{fullDay(h.date)}</p>
                </div>
                {upcoming && <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Upcoming</Badge>}
                {canManage && (
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100" onClick={() => onDelete(h.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function LeaveDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (input: { type: string; startDate: string; endDate: string; reason?: string }) => void }) {
  const [type, setType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const invalid = !startDate || !endDate || startDate > endDate;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Request leave</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Type</Label>
            <Select items={LEAVE_TYPES} value={type} onValueChange={(v) => setType(v ?? 'casual')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{LEAVE_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label className="text-xs">From</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">To</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Reason (optional)</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Add a note for your manager…" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={invalid} onClick={() => { onSubmit({ type, startDate, endDate, reason: reason.trim() || undefined }); onOpenChange(false); setStartDate(''); setEndDate(''); setReason(''); }}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
