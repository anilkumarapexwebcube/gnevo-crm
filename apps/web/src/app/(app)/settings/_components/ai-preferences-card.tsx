'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateAiPreference } from '../actions';

const PROVIDERS = [
  { value: 'auto', label: 'Automatic (best available)' },
  { value: 'groq', label: 'Groq (free, fast)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI (Grok)' },
];

export function AiPreferencesCard({
  provider,
  model,
}: {
  provider: string | null;
  model: string | null;
}) {
  const router = useRouter();
  const [prov, setProv] = useState(provider ?? 'auto');
  const [mdl, setMdl] = useState(model ?? '');
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateAiPreference({
        provider: prov === 'auto' ? null : prov,
        model: mdl.trim() || null,
      });
      if (res.ok) {
        toast.success('AI preferences saved');
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
          <Sparkles className="size-4" />
        </div>
        <h2 className="text-sm font-semibold">AI Preferences</h2>
      </div>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="ai-provider">Default AI provider</Label>
          <Select items={PROVIDERS} value={prov} onValueChange={(v) => setProv(v ?? 'auto')}>
            <SelectTrigger id="ai-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used if that provider&apos;s API key is set in the server env; otherwise falls back to
            the best available.
          </p>
        </div>
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="ai-model">Model override (optional)</Label>
          <Input
            id="ai-model"
            value={mdl}
            onChange={(e) => setMdl(e.target.value)}
            placeholder="e.g. gpt-4o-mini"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the provider&apos;s default model.
          </p>
        </div>
        <div>
          <Button type="submit" loading={pending}>
            Save AI preferences
          </Button>
        </div>
      </form>
    </Card>
  );
}
