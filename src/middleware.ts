import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'firebaseIdToken'; // This is an example, actual cookie might vary or session is handled by Firebase SDK

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Firebase client-side SDK manages auth state primarily in browser storage (IndexedDB).
  // It does not automatically set HTTP cookies like `firebaseIdToken` or `__session`
  // unless a specific server-side session cookie strategy is implemented.
  // Thus, `isAuthenticated` based on these cookies will likely be false from middleware's perspective
  // even if the user is signed in on the client.
  const isAuthenticated = request.cookies.has(AUTH_COOKIE_NAME) || request.cookies.has('__session');

  const publicPaths = ['/auth/sign-in', '/auth/sign-up']; // Add other public paths if any
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    // This logic attempts to redirect already authenticated users away from auth pages.
    // It might not trigger as expected if `isAuthenticated` is always false here due to lack of server-set cookies.
    // However, client-side logic on auth pages can also handle this.
    if (isAuthenticated && pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/battles', request.url));
    }
    return NextResponse.next();
  }

  // The following block is removed/commented out:
  // It was causing a redirect loop because `isAuthenticated` (based on server-readable cookies)
  // would be false even after client-side Firebase sign-in.
  // The client-side application (via `useAuth` hook and page-level checks)
  // is responsible for handling unauthenticated access to protected routes.
  /*
  if (!isAuthenticated && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
    // If user is not authenticated and tries to access a protected page
    let from = pathname;
    if (request.nextUrl.search) {
      from += request.nextUrl.search;
    }
    return NextResponse.redirect(new URL(`/auth/sign-in?from=${encodeURIComponent(from)}`, request.url));
  }
  */

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
