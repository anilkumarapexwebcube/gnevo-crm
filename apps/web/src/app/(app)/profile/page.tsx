import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AtSign,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronRight,
  IdCard,
  KeyRound,
  ListChecks,
  Network,
  ShieldCheck,
  Sparkles,
  UserCircle,
  UserCog,
  Users,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { getMyProfile, getMyProductivity } from '@/lib/team-actions';
import { Card } from '@/components/ui/card';
import { AvatarUploader } from './_components/avatar-uploader';

export const metadata = {
  title: 'My Profile | Gnevo CRM',
  description: 'Your Gnevo CRM employee profile, role and productivity.',
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-border/40 py-3.5 last:border-0">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, label, description, href }: { icon: React.ElementType; label: string; description: string; href: string }) {
  return (
    <Link href={href} className="group -mx-6 flex w-full items-center gap-4 rounded-xl border-b border-border/40 px-6 py-3.5 text-left transition-colors last:border-0 hover:bg-secondary/30">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

function Stat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 text-center shadow-sm">
      <p className={`text-2xl font-bold text-foreground ${className ?? ''}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—');

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [profile, prod] = await Promise.all([getMyProfile(), getMyProductivity()]);
  const fullName = profile?.fullName || user.fullName;
  const email = profile?.email || user.email;
  const roleName = profile?.roleName ?? user.roles.map((r) => String(r)).join(', ');

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/10 via-background to-background p-8 shadow-sm ring-1 ring-border/50">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <AvatarUploader userId={user.id} name={fullName || email} hasAvatar={!!profile?.hasAvatar} />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{fullName}</h1>
            {profile?.designation && <p className="text-sm font-medium text-primary">{profile.designation}</p>}
            <p className="text-sm text-muted-foreground">{email}</p>
            <div className="mt-1 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                <ShieldCheck className="size-3" />
                {roleName}
              </span>
              {profile?.department && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  <Network className="size-3" />
                  {profile.department.name}
                </span>
              )}
              {profile?.employeeId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  <IdCard className="size-3" />
                  {profile.employeeId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Productivity */}
      {prod && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tasks" value={prod.tasksTotal} />
          <Stat label="Completed" value={prod.tasksDone} className="text-emerald-600 dark:text-emerald-400" />
          <Stat label="Overdue" value={prod.tasksOverdue} className={prod.tasksOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
          <Stat label="Completion" value={`${prod.completionRate}%`} className="text-primary" />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Employment */}
        <Card className="rounded-2xl p-6 shadow-sm ring-1 ring-border/50">
          <div className="mb-2 flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><Briefcase className="size-4" /></div>
            <h2 className="text-sm font-semibold text-foreground">Employment</h2>
          </div>
          <div className="mt-2">
            <InfoRow icon={UserCog} label="Designation" value={profile?.designation || '—'} />
            <InfoRow icon={IdCard} label="Employee ID" value={profile?.employeeId || '—'} />
            <InfoRow icon={CalendarClock} label="Joining Date" value={fmtDate(profile?.joiningDate ?? null)} />
            <InfoRow icon={UserCircle} label="Reporting Manager" value={profile?.reportingManagerName || '—'} />
          </div>
        </Card>

        {/* Organization */}
        <Card className="rounded-2xl p-6 shadow-sm ring-1 ring-border/50">
          <div className="mb-2 flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><Building2 className="size-4" /></div>
            <h2 className="text-sm font-semibold text-foreground">Organization</h2>
          </div>
          <div className="mt-2">
            <InfoRow icon={Network} label="Department" value={profile?.department?.name || '—'} />
            <InfoRow icon={Building2} label="Office" value={profile?.office?.name || '—'} />
            <InfoRow icon={Users} label="Teams" value={profile?.teams.length ? profile.teams.map((t) => t.name).join(', ') : '—'} />
            <InfoRow icon={CalendarClock} label="Member Since" value={fmtDate(profile?.createdAt ?? null)} />
          </div>
        </Card>

        {/* Account */}
        <Card className="rounded-2xl p-6 shadow-sm ring-1 ring-border/50">
          <div className="mb-2 flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><UserCircle className="size-4" /></div>
            <h2 className="text-sm font-semibold text-foreground">Account</h2>
          </div>
          <div className="mt-2">
            <InfoRow icon={UserCircle} label="Full Name" value={fullName || '—'} />
            <InfoRow icon={AtSign} label="Email Address" value={email} />
            <InfoRow icon={ShieldCheck} label="MFA Status" value={user.mfaEnabled ? 'Enabled' : 'Not enabled'} />
          </div>
        </Card>

        {/* Security & Settings */}
        <Card className="rounded-2xl p-6 shadow-sm ring-1 ring-border/50">
          <div className="mb-2 flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><KeyRound className="size-4" /></div>
            <h2 className="text-sm font-semibold text-foreground">Security &amp; Settings</h2>
          </div>
          <div className="mt-2">
            <ActionRow icon={KeyRound} label="Change Password" description="Update your account password" href="/settings" />
            <ActionRow icon={ShieldCheck} label="Two-Factor Authentication" description={user.mfaEnabled ? 'Currently enabled' : 'Add an extra layer of security'} href="/settings" />
            <ActionRow icon={ListChecks} label="My Tasks" description="View tasks assigned to you" href="/tasks" />
            <ActionRow icon={Sparkles} label="AI Preferences" description="Configure AI features and models" href="/settings" />
          </div>
        </Card>
      </div>
    </div>
  );
}
