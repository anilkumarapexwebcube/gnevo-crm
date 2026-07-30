import { ragStatus } from '@/lib/rag-actions';
import { SearchClient } from './_components/search-client';

export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  const status = await ragStatus();
  return <SearchClient initialIndexed={status.indexed} configured={status.configured} />;
}
