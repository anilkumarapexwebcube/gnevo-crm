'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/user-avatar';

const MAX_BYTES = 1024 * 1024; // 1 MB

export function AvatarUploader({ userId, name, hasAvatar }: { userId: string; name: string; hasAvatar: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [bust, setBust] = useState(0);
  const [present, setPresent] = useState(hasAvatar);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > MAX_BYTES) return toast.error('Image must be 1 MB or smaller');
    setBusy(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const dataBase64 = dataUrl.split(',')[1] ?? '';
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataBase64, mimeType: file.type }),
      });
      if (res.ok) {
        toast.success('Photo updated');
        setPresent(true);
        setBust(Date.now());
        router.refresh();
      } else {
        const b = (await res.json().catch(() => ({}))) as { detail?: string; message?: string };
        toast.error(b.detail ?? b.message ?? 'Upload failed');
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch('/api/users/me/avatar', { method: 'DELETE' });
      if (res.ok) {
        setPresent(false);
        setBust(Date.now());
        toast.success('Photo removed');
        router.refresh();
      } else toast.error('Could not remove');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group relative">
      <UserAvatar
        userId={userId}
        name={name}
        hasAvatar={present}
        bust={bust}
        className="size-24 rounded-3xl text-3xl font-extrabold shadow-xl shadow-primary/25 ring-4 ring-background"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-transform hover:scale-105 cursor-pointer"
        aria-label="Change photo"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
      </button>
      {present && !busy && (
        <button
          onClick={remove}
          className="absolute -left-1 -top-1 grid size-6 place-items-center rounded-full bg-rose-500 text-white opacity-0 shadow ring-2 ring-background transition-opacity group-hover:opacity-100 cursor-pointer"
          aria-label="Remove photo"
        >
          <X className="size-3" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
