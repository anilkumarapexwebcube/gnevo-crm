'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { updateBranding } from '../actions';
import type { ThemeColorSet, ThemeColors } from './branding-types';

type ThemePref = 'light' | 'dark' | 'system';

// Approximate hex of the built-in theme defaults — the starting swatch shown
// when the org hasn't overridden a color yet.
const COLOR_DEFAULTS: Record<'light' | 'dark', Required<ThemeColors>> = {
  light: { background: '#f7f9fb', foreground: '#1e293b', card: '#ffffff', border: '#e2e8f0' },
  dark: { background: '#141824', foreground: '#f1f5f9', card: '#1c2130', border: '#2b3242' },
};
const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'foreground', label: 'Text' },
  { key: 'card', label: 'Cards / surfaces' },
  { key: 'border', label: 'Borders' },
];
const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** Apply a theme to the live document (so the save previews instantly). */
function applyTheme(theme: ThemePref) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  // Clear any personal override so the workspace default takes effect for the admin too.
  localStorage.removeItem('theme');
}

export function BrandingCard({
  displayName,
  brandColor,
  theme: initialTheme,
  colors: initialColors,
}: {
  displayName: string;
  brandColor: string | null;
  theme: ThemePref;
  colors: ThemeColorSet;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [color, setColor] = useState(brandColor ?? '#6366f1');
  const [theme, setTheme] = useState<ThemePref>(initialTheme);
  const [colors, setColors] = useState<ThemeColorSet>(initialColors ?? {});
  const [editMode, setEditMode] = useState<'light' | 'dark'>('light');
  const [pending, startTransition] = useTransition();

  const colorValue = (mode: 'light' | 'dark', key: keyof ThemeColors) =>
    colors[mode]?.[key] ?? COLOR_DEFAULTS[mode][key];
  const setColorValue = (mode: 'light' | 'dark', key: keyof ThemeColors, hex: string) =>
    setColors((c) => ({ ...c, [mode]: { ...c[mode], [key]: hex } }));
  const resetMode = (mode: 'light' | 'dark') => setColors((c) => ({ ...c, [mode]: {} }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateBranding({ displayName: name.trim(), brandColor: color, theme, colors });
      if (res.ok) {
        applyTheme(theme);
        toast.success('Branding updated');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not save');
      }
    });
  }

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <Palette className="size-4" />
        </div>
        <h2 className="text-sm font-semibold">Branding (white-label)</h2>
      </div>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="brand-name">Workspace name</Label>
          <Input
            id="brand-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
          <p className="text-xs text-muted-foreground">Shown in the sidebar and browser tab.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="brand-color">Brand color</Label>
          <div className="flex items-center gap-3">
            <input
              id="brand-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-1"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-32 font-mono"
              placeholder="#6366f1"
            />
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              Preview
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Applied as the primary accent across the app.
          </p>
        </div>
        <div className="grid gap-2">
          <Label>Default theme</Label>
          <div className="flex items-center gap-1 rounded-xl bg-secondary/40 p-1 ring-1 ring-border/50">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                    theme === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            The workspace&apos;s default appearance for everyone. Members can still switch
            their own view with the theme toggle.
          </p>
        </div>

        {/* Theme colors */}
        <div className="grid gap-2">
          <Label>Theme colors</Label>
          <div className="flex items-center gap-1 rounded-xl bg-secondary/40 p-1 ring-1 ring-border/50">
            {(['light', 'dark'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setEditMode(m)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer',
                  editMode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'light' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {m}
              </button>
            ))}
          </div>
          <div className="grid gap-2 rounded-xl border border-border/50 p-3">
            {COLOR_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <span className="w-32 text-sm text-muted-foreground">{f.label}</span>
                <input
                  type="color"
                  value={colorValue(editMode, f.key)}
                  onChange={(e) => setColorValue(editMode, f.key, e.target.value)}
                  className="size-9 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                  aria-label={`${f.label} color`}
                />
                <Input
                  value={colorValue(editMode, f.key)}
                  onChange={(e) => setColorValue(editMode, f.key, e.target.value)}
                  className="w-28 font-mono text-xs"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => resetMode(editMode)}
              className="w-fit text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline cursor-pointer"
            >
              Reset {editMode} to default
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Customize the {editMode} theme’s colors. Changes apply after you save. Brand
            color (above) stays the primary accent.
          </p>
        </div>

        <div>
          <Button type="submit" loading={pending}>
            {pending ? 'Saving…' : 'Save branding'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
