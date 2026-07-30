import { NextResponse } from 'next/server';
import { apiServer } from '@/lib/session';

/** BFF search: proxies to the API with the session bearer attached. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  try {
    const data = await apiServer<{ results: unknown[] }>(`/v1/search?q=${encodeURIComponent(q)}`);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ results: [] });
  }
}
