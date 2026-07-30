import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { ArticleEditor } from '../../_components/article-editor';

interface Article {
  id: string;
  title: string;
  body: string;
  category: string | null;
  keywords: string | null;
  published: boolean;
}

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let article: Article;
  try {
    article = await apiServer<Article>(`/v1/kb/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Button
        nativeButton={false}
        render={<Link href={`/kb/${id}`} />}
        variant="ghost"
        size="sm"
        className="w-fit"
      >
        <ArrowLeft />
        Back to article
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">Edit article</h1>
      <ArticleEditor initial={article} />
    </div>
  );
}
