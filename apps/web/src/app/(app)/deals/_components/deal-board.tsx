'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { NewDealDialog } from './new-deal-dialog';
import { deleteDeal, moveDeal } from '../actions';

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

function money(v: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(v);
}

function DealCardItem({ deal }: { deal: DealCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/card rounded-lg border bg-card p-3 shadow-xs ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <p className="text-sm font-medium">{deal.title}</p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {money(deal.value, deal.currency)}
        </p>
      </div>
      <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover/card:opacity-100">
        <ConfirmationDialog
          trigger={
            <Button variant="ghost" size="icon-xs" aria-label={`Delete ${deal.title}`}>
              <Trash2 />
            </Button>
          }
          icon={<Trash2 />}
          title="Delete deal?"
          description={`"${deal.title}" will be removed.`}
          confirmText="Delete"
          variant="destructive"
          loading={pending}
          onConfirm={() =>
            startTransition(async () => {
              const res = await deleteDeal(deal.id);
              if (res.ok) {
                toast.success('Deal deleted');
                router.refresh();
              } else {
                toast.error(res.error ?? 'Failed to delete deal');
              }
            })
          }
        />
      </div>
    </div>
  );
}

function StageColumn({ stage }: { stage: Stage }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-medium">
          {stage.name}
          <span className="ml-1.5 text-xs text-muted-foreground">{stage.deals.length}</span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {money(stage.total, 'USD')}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-40 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'bg-muted/30'
        }`}
      >
        {stage.deals.map((deal) => (
          <DealCardItem key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

export function DealBoard({
  initialStages,
  forecast,
}: {
  initialStages: Stage[];
  forecast: number;
}) {
  const [stages, setStages] = useState(initialStages);
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Re-sync when the server sends fresh data (after create/delete revalidation).
  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  function onDragEnd(event: DragEndEvent) {
    const dealId = String(event.active.id);
    const toStageId = event.over ? String(event.over.id) : null;
    if (!toStageId) return;

    const from = stages.find((s) => s.deals.some((d) => d.id === dealId));
    if (!from || from.id === toStageId) return;
    const deal = from.deals.find((d) => d.id === dealId)!;

    // Optimistic move.
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === from.id) {
          const deals = s.deals.filter((d) => d.id !== dealId);
          return { ...s, deals, total: deals.reduce((sum, d) => sum + d.value, 0) };
        }
        if (s.id === toStageId) {
          const deals = [deal, ...s.deals];
          return { ...s, deals, total: deals.reduce((sum, d) => sum + d.value, 0) };
        }
        return s;
      }),
    );

    void moveDeal(dealId, toStageId).then((res) => {
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to move deal');
        setStages(initialStages); // revert
      } else {
        router.refresh();
      }
    });
  }

  const stageOptions = stages.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground">
            Open forecast:{' '}
            <span className="font-medium text-foreground tabular-nums">
              {money(forecast, 'USD')}
            </span>
          </p>
        </div>
        <NewDealDialog stages={stageOptions} />
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <StageColumn key={stage.id} stage={stage} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
