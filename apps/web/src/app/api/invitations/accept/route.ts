import { NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Accept an invitation → create the account → set the httpOnly session cookie. */
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/v1/invitations/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
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
