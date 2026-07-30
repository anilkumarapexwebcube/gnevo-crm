import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function bearer(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

/** List all versions of a file. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await bearer();
  if (!token) return NextResponse.json([], { status: 401 });
  const res = await fetch(`${API_URL}/v1/files/${id}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}

/** Upload a new version of a file (base64 JSON). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await bearer();
  if (!token) return NextResponse.json({ detail: 'Not signed in' }, { status: 401 });
  const body = await req.text();
  const res = await fetch(`${API_URL}/v1/files/${id}/version`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
