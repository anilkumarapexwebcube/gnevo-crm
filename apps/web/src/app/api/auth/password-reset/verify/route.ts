import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(`${API_URL}/v1/auth/password-reset/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
