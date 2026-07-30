import { Megaphone } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { NewAnnouncementDialog } from './_components/new-announcement-dialog';
import { AnnouncementRowActions } from './_components/announcement-row-actions';

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: { fullName: string } | null;
}

export default async function AnnouncementsPage() {
  let announcements: AnnouncementRow[] = [];
  let loadError = false;
  try {
    announcements = await apiServer<AnnouncementRow[]>('/v1/announcements');
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            {announcements.length} {announcements.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
        <NewAnnouncementDialog />
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl border-0 ring-1 ring-border/50">
          Couldn&apos;t load announcements. Please refresh.
        </Card>
      ) : announcements.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center rounded-2xl border-0 ring-1 ring-border/50 bg-gradient-to-b from-card to-card/50 shadow-sm">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary mb-2">
            <Megaphone className="size-6" />
          </span>
          <div>
            <p className="font-semibold text-lg text-foreground">No announcements yet</p>
            <p className="text-sm text-muted-foreground mt-1">Post an update for the whole team.</p>
          </div>
          <div className="mt-2">
            <NewAnnouncementDialog />
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((a) => (
            <Card key={a.id} className="group relative overflow-hidden gap-4 p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:ring-primary/30 bg-gradient-to-br from-card to-card/50">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{a.title}</h2>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <AnnouncementRowActions id={a.id} title={a.title} />
                </div>
              </div>
              <div className="mt-3 bg-secondary/20 rounded-xl p-4 ring-1 ring-border/30">
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">{a.body}</p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {a.author?.fullName?.charAt(0) ?? 'S'}
                </span>
                <p className="text-xs font-medium text-muted-foreground">
                  <span className="text-foreground">{a.author?.fullName ?? 'System'}</span> · {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
