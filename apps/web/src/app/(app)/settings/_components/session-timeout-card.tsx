'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSecuritySettings, updateSecuritySettings } from '../actions';

const OPTIONS = [
  { value: '0', label: 'Never' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
];

export function SessionTimeoutCard() {
  const router = useRouter();
  const [value, setValue] = useState('0');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSecuritySettings().then((s) => {
      setValue(String(s.idleTimeoutMinutes ?? 0));
      setReady(true);
    });
  }, []);

  async function change(v: string) {
    setValue(v);
    setSaving(true);
    const res = await updateSecuritySettings(Number(v));
    setSaving(false);
    if (res.ok) {
      toast.success(v === '0' ? 'Auto sign-out turned off' : 'Session timeout updated');
      router.refresh(); // re-render the app layout so IdleWatcher picks up the new value immediately
    } else {
      toast.error(res.error ?? 'Could not save');
    }
  }

  return (
    <Card className="rounded-2xl p-6 shadow-sm ring-1 ring-border/50">
      <div className="mb-1 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><Timer className="size-4" /></div>
        <h2 className="text-sm font-semibold">Auto sign-out</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Automatically sign everyone out after a period of inactivity. Applies to the whole workspace.
      </p>
      <div className="flex items-center gap-3">
        <Select items={OPTIONS} value={value} onValueChange={(v) => v && change(v)} disabled={!ready || saving}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
          </SelectContent>
        </Select>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
    </Card>
  );
}
