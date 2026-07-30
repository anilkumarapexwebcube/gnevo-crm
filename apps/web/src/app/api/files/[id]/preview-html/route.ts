import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Return rendered HTML for a .docx file preview. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ html: '' }, { status: 401 });
  const res = await fetch(`${API_URL}/v1/files/${id}/preview-html`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({ html: '' }));
  return NextResponse.json(data, { status: res.status });
}
