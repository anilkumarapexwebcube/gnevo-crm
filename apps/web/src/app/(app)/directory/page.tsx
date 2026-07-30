import { getCurrentUser } from '@/lib/session';
import { listUsers, listInvitations, listRoles, getTeamPerformance } from '@/lib/team-actions';
import { TeamManager } from './_components/team-manager';
import { TeamPerformance } from './_components/team-performance';
import { ActivityTimeline } from '@/components/activity-timeline';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Team | Gnevo CRM' };

export default async function DirectoryPage() {
  const [user, users, invitations, roles] = await Promise.all([
    getCurrentUser(),
    listUsers(),
    listInvitations(),
    listRoles(),
  ]);
  const canManage = !!user?.roles.some((r) => r === 'owner' || r === 'admin' || r === 'hr');
  const performance = canManage ? await getTeamPerformance() : [];

  return (
    <div className="flex flex-col gap-6">
      <TeamManager
        meId={user?.id ?? ''}
        meIsOwner={!!user?.roles.includes('owner')}
        canManage={canManage}
        initialUsers={users}
        initialInvites={invitations}
        roles={roles.map((r) => ({ id: r.id, name: r.name, key: r.key }))}
      />

      {canManage && (
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
          <TeamPerformance rows={performance} />
          <Card className="rounded-2xl p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Recent team activity</h2>
            <ActivityTimeline limit={20} />
          </Card>
        </div>
      )}
    </div>
  );
}
