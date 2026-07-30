import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Tag } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Article {
  id: string;
  title: string;
  body: string;
  category: string | null;
  keywords: string | null;
  published: boolean;
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let article: Article;
  try {
    article = await apiServer<Article>(`/v1/kb/${id}`);
  } catch {
    notFound();
  }

  const safeHtml = DOMPurify.sanitize(article.body, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
  });

  const keywords = (article.keywords ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

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

      {/* Category on top */}
      <div className="flex items-center gap-2">
        {article.category ? (
          <Badge variant="secondary" className="rounded-full">
            {article.category}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Uncategorized</span>
        )}
        <Badge variant="outline" className="rounded-full">
          {article.published ? 'Published' : 'Draft'}
        </Badge>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
        <Button nativeButton={false} render={<Link href={`/kb/${id}/edit`} />} variant="outline" size="sm">
          <Pencil />
          Edit
        </Button>
      </div>

      <Card className="p-6">
        <div className="article-content" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      </Card>

      {/* Keywords as buttons/chips */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="size-3.5" />
            Keywords:
          </span>
          {keywords.map((k) => (
            <Badge key={k} variant="outline" className="rounded-full">
              {k}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
