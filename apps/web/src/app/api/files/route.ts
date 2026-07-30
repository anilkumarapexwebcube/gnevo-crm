import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function bearer(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

/** List file metadata for an entity. */
export async function GET(req: Request) {
  const token = await bearer();
  if (!token) return NextResponse.json([], { status: 401 });
  const qs = new URL(req.url).searchParams.toString();
  const res = await fetch(`${API_URL}/v1/files?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}

/** Upload a file (base64 JSON) — routed through here to avoid the 1 MB
 *  server-action body limit. */
export async function POST(req: Request) {
  const token = await bearer();
  if (!token) return NextResponse.json({ detail: 'Not signed in' }, { status: 401 });
  const body = await req.text();
  const res = await fetch(`${API_URL}/v1/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
