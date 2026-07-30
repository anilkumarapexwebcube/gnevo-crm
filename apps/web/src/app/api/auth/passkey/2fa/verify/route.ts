import { NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Verify a passkey second factor, then set the staff session cookie. */
export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(`${API_URL}/v1/auth/passkey/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json({ user: data.user });
  response.cookies.set(ACCESS_COOKIE, data.tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: data.tokens.expiresIn,
  });
  return response;
}
