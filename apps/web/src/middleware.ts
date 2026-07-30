import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, PORTAL_COOKIE } from '@/lib/auth-constants';

/**
 * Gate protected routes:
 *  - `/portal/*` (except the login page) needs a client-portal session.
 *  - all other matched app routes need a staff session.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Client portal: separate credential, its own login page.
  if (pathname.startsWith('/portal')) {
    if (pathname === '/portal/login') return NextResponse.next();
    if (!req.cookies.get(PORTAL_COOKIE)?.value) {
      const url = req.nextUrl.clone();
      url.pathname = '/portal/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Staff app routes.
  if (!req.cookies.get(ACCESS_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/leads/:path*',
    '/customers/:path*',
    '/deals/:path*',
    '/projects/:path*',
    '/tasks/:path*',
    '/automations/:path*',
    '/ai/:path*',
    '/invoices/:path*',
    '/seo/:path*',
    '/content/:path*',
    '/tickets/:path*',
    '/kb/:path*',
    '/announcements/:path*',
    '/chat/:path*',
    '/calendar/:path*',
    '/search/:path*',
    '/insights/:path*',
    '/reports/:path*',
    '/activity/:path*',
    '/audit/:path*',
    '/directory/:path*',
    '/structure/:path*',
    '/roles/:path*',
    '/hr/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/portal/:path*',
  ],
};
