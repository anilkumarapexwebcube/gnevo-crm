import { Handshake } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { DealBoard } from './_components/deal-board';

interface DealCard {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
}
interface Stage {
  id: string;
  name: string;
  position: number;
  total: number;
  deals: DealCard[];
}
interface Board {
  pipeline: { id: string; name: string } | null;
  stages: Stage[];
  forecast: number;
}

export default async function DealsPage() {
  let board: Board = { pipeline: null, stages: [], forecast: 0 };
  let loadError = false;
  try {
    board = await apiServer<Board>('/v1/deals/board');
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <Card className="mx-auto max-w-6xl p-8 text-center text-sm text-muted-foreground">
        Couldn&apos;t load deals. Please refresh.
      </Card>
    );
  }

  if (!board.pipeline) {
    return (
      <Card className="mx-auto flex max-w-6xl flex-col items-center gap-3 p-12 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Handshake className="size-6" />
        </span>
        <div>
          <p className="font-medium">No pipeline yet</p>
          <p className="text-sm text-muted-foreground">
            Run the seed to create the default Sales pipeline.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-full">
      <DealBoard initialStages={board.stages} forecast={board.forecast} />
    </div>
  );
}
