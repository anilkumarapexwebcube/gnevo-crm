import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Public: validate an invitation token for the accept page. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const res = await fetch(`${API_URL}/v1/invitations/verify?token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({ valid: false }));
  return NextResponse.json(data, { status: res.status });
}
