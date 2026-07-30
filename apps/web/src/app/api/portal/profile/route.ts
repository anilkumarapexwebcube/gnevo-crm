import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PORTAL_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** BFF: a signed-in client updates their own profile. */
export async function POST(req: Request) {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: 'Not signed in' }, { status: 401 });
  const body = await req.json();
  const res = await fetch(`${API_URL}/v1/portal/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
