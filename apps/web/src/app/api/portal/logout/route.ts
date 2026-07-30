import { NextResponse } from 'next/server';
import { PORTAL_COOKIE } from '@/lib/auth-constants';

/** Clear the client-portal session cookie. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
