import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** BFF: request a passwordless sign-in link. */
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/v1/auth/magic-link/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
