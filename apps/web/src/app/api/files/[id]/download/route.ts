import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Stream a file download with the httpOnly token attached as bearer. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return new Response('Unauthorized', { status: 401 });

  const inline = new URL(req.url).searchParams.get('inline');
  const res = await fetch(`${API_URL}/v1/files/${id}/download${inline ? '?inline=1' : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return new Response('File not found', { status: res.status });

  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': res.headers.get('content-disposition') ?? 'attachment',
    },
  });
}
