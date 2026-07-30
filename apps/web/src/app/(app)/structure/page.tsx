import { getCurrentUser } from '@/lib/session';
import { getStructure } from '@/lib/structure-actions';
import { StructureManager } from './_components/structure-manager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Org structure | Gnevo CRM' };

export default async function StructurePage() {
  const [user, data] = await Promise.all([getCurrentUser(), getStructure()]);
  const canManage = !!user?.roles.some((r) => r === 'owner' || r === 'admin' || r === 'hr');
  return <StructureManager canManage={canManage} initial={data} />;
}
