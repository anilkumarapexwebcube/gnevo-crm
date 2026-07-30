import { getCurrentUser } from '@/lib/session';
import { listChannels } from '@/lib/chat-actions';
import { getMembers } from '@/lib/crm-actions';
import { ChatClient } from './_components/chat-client';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const user = await getCurrentUser();
  const [channels, members] = await Promise.all([listChannels(), getMembers()]);
  return (
    <ChatClient
      meId={user?.id ?? ''}
      meName={user?.fullName ?? 'You'}
      initialChannels={channels}
      members={members.filter((m) => m.id !== user?.id)}
    />
  );
}
