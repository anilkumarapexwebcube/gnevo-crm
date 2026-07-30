'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { createArticle, updateArticle } from '../actions';

const TITLE_MAX = 120;
const KEYWORDS_MAX = 300;

interface ArticleInitial {
  id?: string;
  title?: string;
  body?: string;
  category?: string | null;
  keywords?: string | null;
  published?: boolean;
}

export function ArticleEditor({ initial }: { initial?: ArticleInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [keywords, setKeywords] = useState(initial?.keywords ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [published, setPublished] = useState(initial?.published ?? true);
  const [pending, startTransition] = useTransition();

  // Approx word count from the HTML body (strip tags).
  const words = body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;

  function save() {
    if (!title.trim()) return toast.error('Title is required');
    if (words === 0) return toast.error('Body is required');
    const input = {
      title: title.trim(),
      body,
      category: category.trim() || undefined,
      keywords: keywords.trim() || undefined,
      published,
    };
    startTransition(async () => {
      const res = isEdit ? await updateArticle(initial!.id!, input) : await createArticle(input);
      if (res.ok) {
        toast.success(isEdit ? 'Article updated' : 'Article created');
        router.push(res.id ? `/kb/${res.id}` : '/kb');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to save');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">Title</Label>
          <span className={`text-xs ${title.length > TITLE_MAX ? 'text-danger' : 'text-muted-foreground'}`}>
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <Input
          id="title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="How to connect Google Search Console"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Getting started"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <span className="text-xs text-muted-foreground">{keywords.length}/{KEYWORDS_MAX}</span>
          </div>
          <Input
            id="keywords"
            value={keywords}
            maxLength={KEYWORDS_MAX}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="seo, gsc, setup"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Body</Label>
          <span className="text-xs text-muted-foreground">{words} words</span>
        </div>
        <RichTextEditor value={body} onChange={setBody} />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          {published ? 'Published' : 'Draft (unpublished)'}
        </label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/kb')} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Publish article'}
          </Button>
        </div>
      </div>
    </div>
  );
}
