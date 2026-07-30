'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Crown, Plus, Minus, Maximize, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StructureMember } from '@/lib/structure-actions';

const NODE_W = 210;
const NODE_H = 84;
const HGAP = 32;
const VGAP = 72;

interface TreeNode {
  m: StructureMember;
  children: TreeNode[];
  x: number;
  y: number;
}

const ROLE_STYLE: Record<string, { ring: string; badge: string; dot: string }> = {
  owner: { ring: 'ring-amber-300 dark:ring-amber-500/40', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'from-amber-400 to-amber-600' },
  admin: { ring: 'ring-violet-300 dark:ring-violet-500/40', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', dot: 'from-violet-400 to-violet-600' },
  hr: { ring: 'ring-pink-300 dark:ring-pink-500/40', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', dot: 'from-pink-400 to-pink-600' },
  manager: { ring: 'ring-blue-300 dark:ring-blue-500/40', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', dot: 'from-blue-400 to-blue-600' },
  member: { ring: 'ring-emerald-300 dark:ring-emerald-500/40', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'from-emerald-400 to-emerald-600' },
  viewer: { ring: 'ring-slate-300 dark:ring-slate-500/40', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300', dot: 'from-slate-400 to-slate-600' },
};
const roleStyle = (k: string) => ROLE_STYLE[k] ?? ROLE_STYLE.member!;
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';

/** Build a reporting tree: root = owner, parent = reportingManager (valid, acyclic) else owner. */
function buildForest(members: StructureMember[]): { roots: TreeNode[]; width: number; height: number } {
  const byId = new Map(members.map((m) => [m.id, m]));
  const owner = members.find((m) => m.isOwner) ?? members[0];
  const nodes = new Map<string, TreeNode>(members.map((m) => [m.id, { m, children: [], x: 0, y: 0 }]));

  const parentOf = (m: StructureMember): string | null => {
    if (owner && m.id === owner.id) return null;
    // Walk the reporting chain; if it reaches owner/valid non-cyclic manager, use direct manager.
    let mgr = m.reportingManagerId;
    const seen = new Set<string>([m.id]);
    while (mgr) {
      if (seen.has(mgr) || !byId.has(mgr)) { mgr = null; break; }
      seen.add(mgr);
      if (mgr === m.reportingManagerId) break; // direct manager valid
      mgr = byId.get(mgr)?.reportingManagerId ?? null;
    }
    if (m.reportingManagerId && byId.has(m.reportingManagerId) && m.reportingManagerId !== m.id) {
      return m.reportingManagerId;
    }
    return owner ? owner.id : null;
  };

  const roots: TreeNode[] = [];
  for (const m of members) {
    const node = nodes.get(m.id)!;
    const pid = parentOf(m);
    if (pid && nodes.has(pid) && pid !== m.id) nodes.get(pid)!.children.push(node);
    else roots.push(node);
  }

  // Tidy layout: leaves get sequential columns, parents centered over children.
  let cursor = 0;
  let maxDepth = 0;
  const place = (node: TreeNode, depth: number) => {
    node.y = depth;
    maxDepth = Math.max(maxDepth, depth);
    if (node.children.length === 0) {
      node.x = cursor++;
    } else {
      node.children.forEach((c) => place(c, depth + 1));
      node.x = (node.children[0]!.x + node.children[node.children.length - 1]!.x) / 2;
    }
  };
  roots.forEach((r) => place(r, 0));

  return {
    roots,
    width: Math.max(cursor, 1) * (NODE_W + HGAP),
    height: (maxDepth + 1) * (NODE_H + VGAP),
  };
}

function flatten(roots: TreeNode[]): { nodes: TreeNode[]; edges: [TreeNode, TreeNode][] } {
  const nodes: TreeNode[] = [];
  const edges: [TreeNode, TreeNode][] = [];
  const walk = (n: TreeNode) => {
    nodes.push(n);
    n.children.forEach((c) => {
      edges.push([n, c]);
      walk(c);
    });
  };
  roots.forEach(walk);
  return { nodes, edges };
}

export function OrgChart({ members }: { members: StructureMember[] }) {
  const { roots, width, height } = useMemo(() => buildForest(members), [members]);
  const { nodes, edges } = useMemo(() => flatten(roots), [roots]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const px = (x: number) => x * (NODE_W + HGAP);
  const py = (y: number) => y * (NODE_H + VGAP);

  const center = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    setScale(1);
    setOffset({ x: Math.max(24, vp.clientWidth / 2 - width / 2), y: 24 });
  }, [width]);

  useLayoutEffect(() => {
    center();
  }, [center]);

  // Wheel zoom (non-passive so we can prevent page scroll over the canvas).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(1.6, Math.max(0.4, s - e.deltaY * 0.0012)));
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-node]')) return; // let node interactions through
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  }
  function onPointerUp(e: React.PointerEvent) {
    drag.current = null;
    setDragging(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  if (members.length === 0) {
    return (
      <div className="grid h-[420px] place-items-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
        No members to chart yet.
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={cn(
        'relative h-[640px] w-full select-none overflow-hidden rounded-2xl border border-border/50 bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:22px_22px]',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      {/* Controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1 rounded-xl border border-border/50 bg-card/90 p-1 shadow-sm backdrop-blur">
        <button onClick={() => setScale((s) => Math.min(1.6, s + 0.15))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Zoom in"><Plus className="size-4" /></button>
        <button onClick={() => setScale((s) => Math.max(0.4, s - 0.15))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Zoom out"><Minus className="size-4" /></button>
        <button onClick={center} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Reset view"><Maximize className="size-4" /></button>
      </div>
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-border/50 bg-card/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        <Move className="size-3" /> Drag to pan · scroll to zoom
      </div>

      {/* Canvas */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, width, height }}
      >
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={width} height={height}>
          {edges.map(([p, c], i) => {
            const x1 = px(p.x) + NODE_W / 2;
            const y1 = py(p.y) + NODE_H;
            const x2 = px(c.x) + NODE_W / 2;
            const y2 = py(c.y);
            const mid = (y1 + y2) / 2;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`}
                fill="none"
                className="stroke-border"
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {nodes.map((n) => {
          const rs = roleStyle(n.m.roleKey);
          return (
            <div
              key={n.m.id}
              data-node
              className={cn(
                'absolute flex items-center gap-2.5 rounded-2xl border border-border/50 bg-card p-3 shadow-md ring-2 transition-shadow hover:shadow-lg',
                rs.ring,
              )}
              style={{ left: px(n.x), top: py(n.y), width: NODE_W, height: NODE_H }}
            >
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br text-sm font-bold text-white shadow-sm', rs.dot)}>
                {initials(n.m.fullName || n.m.email)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-sm font-semibold text-foreground">{n.m.fullName || n.m.email}</span>
                  {n.m.isOwner && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{n.m.designation || n.m.email}</p>
                <span className={cn('mt-0.5 inline-block rounded-full px-1.5 py-0 text-[10px] font-medium', rs.badge)}>{n.m.roleName}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
