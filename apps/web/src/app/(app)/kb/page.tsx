import Link from 'next/link';
import { BookOpen, Pencil, Plus } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailLink } from '@/components/detail-link';
import { ArticleRowActions } from './_components/article-row-actions';

interface ArticleRow {
  id: string;
  title: string;
  category: string | null;
  published: boolean;
}

export default async function KbPage() {
  let articles: ArticleRow[] = [];
  let loadError = false;
  try {
    articles = await apiServer<ArticleRow[]>('/v1/kb');
  } catch {
    loadError = true;
  }

  const NewButton = (
    <Button nativeButton={false} render={<Link href="/kb/new" />} className="rounded-full shadow-sm hover:shadow-md transition-all">
      <Plus className="mr-1 size-4" />
      New article
    </Button>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge base</h1>
          <p className="text-sm text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'article' : 'articles'}
          </p>
        </div>
        {NewButton}
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl border-0 ring-1 ring-border/50">
          Couldn&apos;t load articles. Please refresh.
        </Card>
      ) : articles.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center rounded-2xl border-0 ring-1 ring-border/50 bg-gradient-to-b from-card to-card/50 shadow-sm">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary mb-2">
            <BookOpen className="size-6" />
          </span>
          <div>
            <p className="font-semibold text-lg text-foreground">No articles yet</p>
            <p className="text-sm text-muted-foreground mt-1">Write your first help article.</p>
          </div>
          <div className="mt-2">
            {NewButton}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {articles.map((a) => (
            <Card key={a.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl shadow-sm border-0 ring-1 ring-border/50 hover:shadow-md hover:-translate-y-0.5 hover:ring-primary/30 transition-all duration-300 bg-gradient-to-br from-card to-card/50">
              <div className="flex flex-wrap items-center gap-3">
                <DetailLink href={`/kb/${a.id}`} tip="Read article">
                  <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors">{a.title}</span>
                </DetailLink>
                <div className="flex items-center gap-2">
                  {a.category && <Badge variant="secondary" className="rounded-full bg-secondary/50 font-medium">{a.category}</Badge>}
                  <Badge variant="outline" className={`rounded-full font-medium ${a.published ? 'text-primary ring-primary/30' : 'text-muted-foreground ring-border/50'}`}>
                    {a.published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:self-center opacity-70 group-hover:opacity-100 transition-opacity">
                <Button
                  nativeButton={false}
                  render={<Link href={`/kb/${a.id}/edit`} />}
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${a.title}`}
                  className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Pencil className="size-4" />
                </Button>
                <ArticleRowActions id={a.id} title={a.title} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
