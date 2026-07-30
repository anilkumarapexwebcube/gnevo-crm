import { getCurrentUser } from '@/lib/session';
import { listRoles, getRoleCatalog } from '@/lib/team-actions';
import { RolesManager } from './_components/roles-manager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Roles & permissions | Gnevo CRM' };

export default async function RolesPage() {
  const [user, roles, catalog] = await Promise.all([getCurrentUser(), listRoles(), getRoleCatalog()]);
  const canManage = !!user?.roles.some((r) => r === 'owner' || r === 'admin');
  return <RolesManager canManage={canManage} initialRoles={roles} catalog={catalog} />;
}
