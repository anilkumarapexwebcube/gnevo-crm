import { PenSquare } from 'lucide-react';
import { ContentBoard } from './_components/content-board';

export const metadata = { title: 'Content planner | Gnevo CRM' };

export default function ContentPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <PenSquare className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content planner</h1>
          <p className="text-sm text-muted-foreground">Plan content from idea to published</p>
        </div>
      </div>

      <ContentBoard />
    </div>
  );
}
