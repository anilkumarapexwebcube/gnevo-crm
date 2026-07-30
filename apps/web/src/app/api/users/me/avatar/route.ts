import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function bearer(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

/** Upload the current user's avatar (base64 JSON) — routed here to avoid the 1 MB server-action cap. */
export async function POST(req: Request) {
  const token = await bearer();
  if (!token) return NextResponse.json({ detail: 'Not signed in' }, { status: 401 });
  const body = await req.text();
  const res = await fetch(`${API_URL}/v1/users/me/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE() {
  const token = await bearer();
  if (!token) return NextResponse.json({ detail: 'Not signed in' }, { status: 401 });
  const res = await fetch(`${API_URL}/v1/users/me/avatar`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
