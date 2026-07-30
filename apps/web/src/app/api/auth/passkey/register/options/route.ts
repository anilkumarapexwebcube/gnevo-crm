import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: 'Not signed in' }, { status: 401 });
  const res = await fetch(`${API_URL}/v1/auth/passkey/register/options`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
