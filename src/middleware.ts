import { NextRequest, NextResponse } from 'next/server';

const ALLOWLIST = ['/pass', '/api/pass', '/_next', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is in allowlist
  if (ALLOWLIST.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const cookieName = process.env.ACCESS_COOKIE_NAME || 'vwf_access';
  const authCookie = request.cookies.get(cookieName);

  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.redirect(
      new URL(`/pass?next=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
