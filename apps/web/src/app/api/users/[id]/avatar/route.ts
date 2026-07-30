import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Stream a user's avatar image (authed via httpOnly cookie). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return new Response(null, { status: 401 });
  const res = await fetch(`${API_URL}/v1/users/${id}/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return new Response(null, { status: res.status });
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/png',
      'Cache-Control': 'private, max-age=60',
    },
  });
}
