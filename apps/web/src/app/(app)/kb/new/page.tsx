import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArticleEditor } from '../_components/article-editor';

export default function NewArticlePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Button
        nativeButton={false}
        render={<Link href="/kb" />}
        variant="ghost"
        size="sm"
        className="w-fit"
      >
        <ArrowLeft />
        Back to knowledge base
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">New article</h1>
      <ArticleEditor />
    </div>
  );
}
