'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Video,
  Users,
  Check,
  X,
  Trash2,
  Pencil,
  CalendarClock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
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
import type { Member } from '@/lib/crm-actions';
import {
  createEvent,
  deleteEvent,
  listEvents,
  respondEvent,
  summarizeEvent,
  updateEvent,
  upcomingEvents,
  type CalendarEvent,
  type EventInput,
} from '@/lib/calendar-actions';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function localDate(iso: string): string {
  return ymd(new Date(iso));
}
function localTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function combineISO(date: string, time: string): string {
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function fmtRange(e: CalendarEvent): string {
  const s = new Date(e.startAt);
  if (e.allDay) return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · All day`;
  const en = new Date(e.endAt);
  const sameDay = s.toDateString() === en.toDateString();
  const t = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay
    ? `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${t(s)} – ${t(en)}`
    : `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} → ${en.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

const TYPE_CHIP: Record<string, string> = {
  meeting: 'bg-primary/15 text-primary',
  event: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
};

export function CalendarClient({
  meId,
  initialEvents,
  initialUpcoming,
  members,
}: {
  meId: string;
  initialEvents: CalendarEvent[];
  initialUpcoming: CalendarEvent[];
  members: Member[];
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>(initialUpcoming);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [presetDate, setPresetDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const refresh = useCallback(async () => {
    const [e, u] = await Promise.all([listEvents(), upcomingEvents()]);
    setEvents(e);
    setUpcoming(u);
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = localDate(e.startAt);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const firstWeekday = cursor.getDay();
  const gridStart = addDays(cursor, -firstWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayKey = ymd(new Date());
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  function openNew(date?: string) {
    setEditing(null);
    setPresetDate(date ?? ymd(new Date()));
    setDialogOpen(true);
  }
  function openEdit(e: CalendarEvent) {
    setDetail(null);
    setEditing(e);
    setPresetDate(null);
    setDialogOpen(true);
  }

  async function submit(payload: EventInput) {
    const res = editing ? await updateEvent(editing.id, payload) : await createEvent(payload);
    if (res.ok) {
      toast.success(editing ? 'Event updated' : 'Event created');
      setDialogOpen(false);
      await refresh();
    } else {
      toast.error(res.error ?? 'Could not save');
    }
  }

  async function respond(e: CalendarEvent, status: 'accepted' | 'declined') {
    const res = await respondEvent(e.id, status);
    if (res.ok) {
      toast.success(status === 'accepted' ? 'Accepted' : 'Declined');
      await refresh();
      setDetail(null);
    } else toast.error(res.error ?? 'Failed');
  }

  async function remove(e: CalendarEvent) {
    const res = await deleteEvent(e.id);
    if (res.ok) {
      toast.success('Event deleted');
      setDetail(null);
      await refresh();
    } else toast.error(res.error ?? 'Failed');
  }

  async function summarize(e: CalendarEvent) {
    setSummarizing(true);
    const res = await summarizeEvent(e.id);
    setSummarizing(false);
    if (res.ok) {
      setDetail((d) => (d && d.id === e.id ? { ...d, summary: res.summary ?? null } : d));
      toast.success('AI summary ready');
      await refresh();
    } else toast.error(res.error ?? 'Failed');
  }

  const myStatus = (e: CalendarEvent) => e.attendees.find((a) => a.userId === meId)?.status;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Calendar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Events, meetings &amp; scheduling</p>
        </div>
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="size-4" />
          New event
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="rounded-2xl border-0 p-4 shadow-sm ring-1 ring-border/50">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="xs" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); }}>
                Today
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border/40">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-card py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {d}
              </div>
            ))}
            {cells.map((day) => {
              const key = ymd(day);
              const inMonth = day.getMonth() === cursor.getMonth();
              const dayEvents = byDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={cn('group min-h-24 bg-card p-1.5 transition-colors hover:bg-secondary/20', !inMonth && 'bg-secondary/20')}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <button
                      onClick={() => openNew(key)}
                      className="grid size-5 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                      aria-label={`Add event on ${key}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                    <span className={cn('text-right text-xs font-medium', key === todayKey ? 'text-primary' : inMonth ? 'text-foreground/70' : 'text-muted-foreground/40')}>
                      {key === todayKey ? (
                        <span className="inline-grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {day.getDate()}
                        </span>
                      ) : (
                        day.getDate()
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setDetail(e)}
                        className={cn('flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80', TYPE_CHIP[e.type])}
                      >
                        {e.type === 'meeting' ? <Video className="size-2.5 shrink-0" /> : <span className="size-1.5 shrink-0 rounded-full bg-current" />}
                        <span className="truncate">{e.allDay ? '' : `${localTime(e.startAt)} `}{e.title}</span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && <span className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Upcoming */}
        <Card className="h-fit rounded-2xl border-0 p-4 shadow-sm ring-1 ring-border/50">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarClock className="size-4 text-primary" />
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((e) => {
                const st = myStatus(e);
                return (
                  <li key={e.id}>
                    <button onClick={() => setDetail(e)} className="flex w-full flex-col gap-0.5 rounded-xl border border-border/50 p-2.5 text-left transition-colors hover:bg-secondary/30">
                      <div className="flex items-center gap-1.5">
                        {e.type === 'meeting' && <Video className="size-3 text-primary" />}
                        <span className="truncate text-sm font-medium text-foreground">{e.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{fmtRange(e)}</span>
                      {st === 'invited' && (
                        <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          Awaiting your response
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <EventDialog
        key={(editing?.id ?? 'new') + String(dialogOpen)}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        presetDate={presetDate}
        members={members}
        onSubmit={submit}
      />

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  <span className={cn('grid size-7 place-items-center rounded-lg', TYPE_CHIP[detail.type])}>
                    {detail.type === 'meeting' ? <Video className="size-4" /> : <CalendarDays className="size-4" />}
                  </span>
                  <span className="truncate">{detail.title}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  {fmtRange(detail)}
                </div>
                {detail.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4" />
                    {detail.location}
                  </div>
                )}
                {detail.meetingUrl && (
                  <a href={detail.meetingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Video className="size-4" />
                    Join meeting
                  </a>
                )}
                {detail.description && <p className="whitespace-pre-wrap text-foreground/90">{detail.description}</p>}

                <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/5 to-purple-500/5 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Sparkles className="size-3.5" />
                      AI summary
                    </span>
                    <Button
                      size="xs"
                      variant={detail.summary ? 'outline' : 'default'}
                      onClick={() => summarize(detail)}
                      loading={summarizing}
                    >
                      {!summarizing && (detail.summary ? <RefreshCw className="size-3" /> : <Sparkles className="size-3" />)}
                      {detail.summary ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>
                  {detail.summary ? (
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{detail.summary}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Generate an AI brief with agenda &amp; action items.</p>
                  )}
                </div>
                {detail.attendees.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Users className="size-3.5" />
                      Attendees
                    </span>
                    <ul className="flex flex-col gap-1">
                      {detail.attendees.map((a) => (
                        <li key={a.userId} className="flex items-center justify-between text-xs">
                          <span>{a.name}</span>
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0 font-medium capitalize',
                              a.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : a.status === 'declined' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
                            )}
                          >
                            {a.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                {myStatus(detail) === 'invited' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => respond(detail, 'declined')}>
                      <X className="size-4" />
                      Decline
                    </Button>
                    <Button size="sm" onClick={() => respond(detail, 'accepted')}>
                      <Check className="size-4" />
                      Accept
                    </Button>
                  </>
                )}
                {detail.createdBy === meId && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEdit(detail)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-rose-500" onClick={() => remove(detail)}>
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventDialog({
  open,
  onOpenChange,
  editing,
  presetDate,
  members,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CalendarEvent | null;
  presetDate: string | null;
  members: Member[];
  onSubmit: (payload: EventInput) => Promise<void>;
}) {
  const baseDate = editing ? localDate(editing.startAt) : presetDate ?? ymd(new Date());
  const [title, setTitle] = useState(editing?.title ?? '');
  const [type, setType] = useState<'event' | 'meeting'>(editing?.type ?? 'meeting');
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [date, setDate] = useState(baseDate);
  const [startTime, setStartTime] = useState(editing && !editing.allDay ? localTime(editing.startAt) : '10:00');
  const [endTime, setEndTime] = useState(editing && !editing.allDay ? localTime(editing.endAt) : '11:00');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [meetingUrl, setMeetingUrl] = useState(editing?.meetingUrl ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [attendees, setAttendees] = useState<Set<string>>(new Set(editing?.attendees.map((a) => a.userId) ?? []));
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setAttendees((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const invalid = !title.trim() || (!allDay && startTime >= endTime);

  async function submit() {
    if (!title.trim()) return;
    const startAt = allDay ? combineISO(date, '00:00') : combineISO(date, startTime);
    const endAt = allDay ? combineISO(date, '23:59') : combineISO(date, endTime);
    if (new Date(endAt) < new Date(startAt)) {
      toast.error('End time must be after start time');
      return;
    }
    setSaving(true);
    await onSubmit({
      title: title.trim(),
      type,
      allDay,
      startAt,
      endAt,
      location: location.trim() || undefined,
      meetingUrl: meetingUrl.trim() || undefined,
      description: description.trim() || undefined,
      attendeeIds: Array.from(attendees),
    });
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit event' : 'New event'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ev-title">Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kickoff call with Acme" autoFocus />
          </div>

          <div className="flex items-center gap-2">
            {(['meeting', 'event'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium capitalize transition-colors',
                  type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:bg-secondary/50',
                )}
              >
                {t === 'meeting' ? <Video className="size-3.5" /> : <CalendarDays className="size-3.5" />}
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAllDay((v) => !v)}
              className={cn(
                'ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                allDay ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:bg-secondary/50',
              )}
            >
              <span className={cn('grid size-4 place-items-center rounded border', allDay ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                {allDay && <Check className="size-3" />}
              </span>
              Full day
            </button>
          </div>

          <div className={cn('grid gap-3', allDay ? 'grid-cols-1' : 'grid-cols-[1fr_auto_auto]')}>
            <div className="grid gap-2">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {!allDay && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="ev-start">Start</Label>
                  <Input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ev-end">End</Label>
                  <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </>
            )}
          </div>

          {type === 'meeting' && (
            <div className="grid gap-2">
              <Label htmlFor="ev-url">Meeting link</Label>
              <Input id="ev-url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="ev-loc">Location</Label>
            <Input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office / address (optional)" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-desc">Notes</Label>
            <Textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Agenda / details (optional)" rows={2} />
          </div>

          {members.length > 0 && (
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                Invite attendees
              </Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-1">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary/50"
                  >
                    <span className={cn('grid size-4 shrink-0 place-items-center rounded border', attendees.has(m.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                      {attendees.has(m.id) && <Check className="size-3" />}
                    </span>
                    <span className="grid size-6 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                      {m.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <span className="truncate">{m.fullName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={invalid}>
            {editing ? 'Save changes' : 'Create event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
