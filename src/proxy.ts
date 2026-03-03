import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Enhanced Security Proxy
 * Handles server-side redirects for protected routes.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Log all intercepted requests to help debugging
    if (pathname.includes('admin') || pathname.includes('dashboard')) {
        console.log(`[Proxy] Intercepted: ${pathname}`);
    }

    // 1. Admin Portal Protection
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        // Exclude the login page and the login API
        if (pathname === '/admin/login' || pathname === '/api/admin/login') {
            return NextResponse.next();
        }

        const adminSession = request.cookies.get('admin_session')?.value;
        const isAuthorized = adminSession === 'true';

        if (!isAuthorized) {
            console.log(`[Proxy-Security] Blocking unauthorized access to ${pathname}`);
            // Use an absolute URL for the redirect
            const loginUrl = new URL('/admin/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    // 2. Student Dashboard Protection
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname.startsWith('/read')) {
        const userSession = request.cookies.get('user_session')?.value;
        if (!userSession) {
            const loginUrl = new URL('/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

// Support for older convention just in case
export const middleware = proxy;

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
