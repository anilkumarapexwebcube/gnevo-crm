'use client';

import { useEffect, useState } from 'react';
import { UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMembers, setAccountManager, type Member } from '@/lib/crm-actions';

export function AccountManagerCard({
  customerId,
  initial,
}: {
  customerId: string;
  initial: { id: string; fullName: string } | null;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [value, setValue] = useState(initial?.id ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMembers().then(setMembers);
  }, []);

  async function change(v: string) {
    setValue(v);
    setSaving(true);
    const res = await setAccountManager(customerId, v || null);
    setSaving(false);
    if (res.ok) toast.success('Account manager updated');
    else toast.error(res.error ?? 'Could not save');
  }

  const options = [{ value: '', label: 'Unassigned' }, ...members.map((m) => ({ value: m.id, label: m.fullName }))];

  return (
    <Card className="rounded-2xl p-6 shadow-sm ring-1 ring-border/50">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><UserCog className="size-4" /></div>
        <h2 className="text-sm font-semibold text-foreground">Account manager</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">The team member who owns this client relationship. Shown to the client in their portal.</p>
      <Select items={options} value={value} onValueChange={(v) => v !== value && change(v ?? '')} disabled={saving}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (<SelectItem key={o.value || 'none'} value={o.value}>{o.label}</SelectItem>))}
        </SelectContent>
      </Select>
    </Card>
  );
}
