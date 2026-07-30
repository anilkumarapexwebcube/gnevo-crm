'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <ConfirmationDialog
      trigger={<Button className="cursor-pointer" variant="outline">Sign out</Button>}
      icon={<LogOut />}
      title="Sign out?"
      description="You'll need to sign in again."
      confirmText="Sign out"
      cancelText="Cancel"
      variant="destructive"
      loading={loading}
      onConfirm={logout}
    />
  );
}
