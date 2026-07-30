import { NextResponse } from 'next/server';
import { PORTAL_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * BFF portal login: proxy client credentials to the API, then store the
 * portal token in an httpOnly cookie (separate from the staff session).
 */
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/v1/portal/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE, data.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: data.expiresIn,
  });
  return response;
}
