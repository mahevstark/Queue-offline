import { NextResponse } from 'next/server';
import * as jose from 'jose';
import createMiddleware from 'next-intl/middleware';

const locales = ['en', 'az'];
const defaultLocale = 'en';

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export async function middleware(request) {
  const { nextUrl: url } = request;
  const token = request.cookies.get('auth_token');
  const path = url.pathname;

  // Skip middleware for API routes and static files
  if (
    path.startsWith('/api/') || 
    path.startsWith('/_next/') || 
    path.includes('.') ||
    path.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Handle internationalization first
  const response = await intlMiddleware(request);
  
  // Get the pathname without locale and current locale
  const hasLocale = locales.some(locale => path.startsWith(`/${locale}`));
  const pathWithoutLocale = hasLocale ? path.replace(/^\/[a-z]{2}/, '') : path;
  const currentLocale = hasLocale ? path.split('/')[1] : defaultLocale;

  // List of public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/register',
    '/reset-password',
    '/display-screen',
    '/api/display-tokens',
    '/display-screen/[branchId]',
    '/api/display-tokens',
    '/admin/branches/[branchId]/token-generation',
    '/api/branches/[branchId]/tokens/generate',
    '/api/branches/[branchId]/services',
    '/api/branches/[branchId]/services/[serviceid]/sub-services',
    '/desk-screen/[deskId]',
    '/api/desks/[deskId]/screen',
  ];

  // Check if the current path matches any of the public paths
  const isPublicPath = publicPaths.some(publicPath => {
    const pathPattern = publicPath.replace(/\[.*?\]/g, '[^/]+');
    const regex = new RegExp(`^${pathPattern}$`);
    return regex.test(pathWithoutLocale);
  });

  // Handle public paths
  if (isPublicPath) {
    if ((pathWithoutLocale === '/login' || pathWithoutLocale === '/register') && token) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const verified = await jose.jwtVerify(token.value, secret);
        const userRole = verified.payload.role;

        switch (userRole) {
          case 'MANAGER':
            return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, request.url));
          case 'SUPERADMIN':
            return NextResponse.redirect(new URL(`/${currentLocale}/admin/branches`, request.url));
          case 'EMPLOYEE':
            return NextResponse.redirect(new URL(`/${currentLocale}/employee-dashboard`, request.url));
          default:
            return response;
        }
      } catch (error) {
        const response = NextResponse.next();
        response.cookies.delete('auth_token');
        return response;
      }
    }
    return response;
  }

  // Handle root path
  if (pathWithoutLocale === '' || pathWithoutLocale === '/') {
    if (!token) {
      return NextResponse.redirect(new URL(`/en/login`, request.url));
    }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const verified = await jose.jwtVerify(token.value, secret);
      const userRole = verified.payload.role;

      switch (userRole) {
        case 'MANAGER':
          return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, request.url));
        case 'EMPLOYEE':
          return NextResponse.redirect(new URL(`/${currentLocale}/employee-dashboard`, request.url));
        case 'SUPERADMIN':
          return NextResponse.redirect(new URL(`/${currentLocale}/admin/branches`, request.url));
        default:
          return NextResponse.redirect(new URL(`/${currentLocale}/login`, request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL(`/${currentLocale}/login`, request.url));
    }
  }

  // Check authentication for protected routes
  if (!token) {
    return NextResponse.redirect(new URL(`/en/login`, request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const verified = await jose.jwtVerify(token.value, secret);
    const userRole = verified.payload.role;

    // Role-based access control
    switch (true) {
      case pathWithoutLocale === '/dashboard':
        if (userRole === 'EMPLOYEE') {
          return NextResponse.redirect(new URL(`/${currentLocale}/employee-dashboard`, request.url));
        }
        break;

      case pathWithoutLocale === '/employee-dashboard':
        if (userRole === 'SUPERADMIN') {
          return NextResponse.redirect(new URL(`/${currentLocale}/admin/branches`, request.url));
        }
        if (userRole === 'MANAGER') {
          return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, request.url));
        }
        break;

      // User Logs (SUPERADMIN, ADMIN and MANAGER only)
      case pathWithoutLocale.match(/^\/user-logs\/[^/]+$/):
        if (userRole === 'EMPLOYEE') {
          return NextResponse.redirect(new URL(`/${currentLocale}/employee-dashboard`, request.url));
        }
        break;

      // Admin routes
      case pathWithoutLocale.startsWith('/admin'):
        if (userRole === 'EMPLOYEE') {
          return NextResponse.redirect(new URL(`/${currentLocale}/employee-dashboard`, request.url));
        }

        // Branch-specific routes that only managers can access
        if (pathWithoutLocale.match(/^\/admin\/branches\/[\w-]+\/(services|users|desks|token-series)/)) {
          if (userRole !== 'MANAGER' && userRole !== 'SUPERADMIN') {
            // For API routes, return 403 instead of redirecting
            if (pathWithoutLocale.startsWith('/api/')) {
              return new NextResponse(
                JSON.stringify({ error: 'Unauthorized access' }),
                {
                  status: 403,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
            // Redirect non-managers to branches list
            return NextResponse.redirect(new URL(`/${currentLocale}/admin/branches`, request.url));
          }
        }

        // General branches routes
        if (pathWithoutLocale.startsWith('/admin/branches')) {
          if (userRole !== 'MANAGER' && userRole !== 'SUPERADMIN') {
            // For API routes, return 403 instead of redirecting
            if (pathWithoutLocale.startsWith('/api/')) {
              return new NextResponse(
                JSON.stringify({ error: 'Unauthorized access' }),
                {
                  status: 403,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
            return NextResponse.redirect(new URL(`/${currentLocale}/admin/users`, request.url));
          }
        }
        break;

      // API routes for branches and related services
      case pathWithoutLocale.startsWith('/api/branches'):
        // Extract the path segments to check for specific routes
        const pathSegments = pathWithoutLocale.split('/');
        const isServiceRoute = pathSegments.includes('services');
        const isUserRoute = pathSegments.includes('users');
        const isDeskRoute = pathSegments.includes('desks');
        const isTokenRoute = pathSegments.includes('tokens') || pathSegments.includes('token-series');

        // If it's a protected route (services, users, desks, tokens)
        if (isServiceRoute || isUserRoute || isDeskRoute || isTokenRoute) {
          if (userRole !== 'MANAGER' && userRole !== 'SUPERADMIN') {
            return new NextResponse(
              JSON.stringify({ error: 'Unauthorized access' }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
        }

        // For other branch routes, allow both SUPERADMIN and MANAGER
        if (userRole !== 'MANAGER' && userRole !== 'SUPERADMIN') {
          return new NextResponse(
            JSON.stringify({ error: 'Unauthorized access' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        break;

      // Profile and Settings routes (accessible by all authenticated users)
      case pathWithoutLocale === '/profile' || pathWithoutLocale === '/settings':
        return NextResponse.next();
        break;
    }

    return response;

  } catch (error) {
    // Invalid token, redirect to login
    return NextResponse.redirect(new URL(`/${currentLocale}/login`, request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/(az|en)/:path*',
  ]
};
