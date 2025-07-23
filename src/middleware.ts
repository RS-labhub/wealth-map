import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Session } from "next-auth";

// Define route patterns
const ROUTES = {
  SUPER_ADMIN: '/app/super-admin',
  COMPANY_ADMIN: '/app/company-admin',
  EMPLOYEE: '/app/employee',
  AUTH: '/auth',
  API: '/api',
  APP_ROOT: '/app',
} as const;

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  {
    path: '/api/organizations',
    methods: ['POST'], // Only allow POST for organization registration
  },
  {
    path: '/api/invitations',
    methods: ['POST'],
  },
  {
    path: '/api/organizations/[id]/invitations',
    methods: ['POST'],
  },
  {
    path: '/api/organizations/[id]/status',
    methods: ['PATCH'],
  },
  {
    path: '/api/company-admin/employees',
    methods: ['GET'],
  },
  {
    path: '/api/company-admin/employees/[id]/role',
    methods: ['PATCH'],
  },
  {
    path: '/api/company-admin/roles',
    methods: ['GET', 'POST', 'DELETE'],
  },
  {
    path: '/api/company-admin/permissions',
    methods: ['GET'],
  },
  // Auth routes - critical to keep these public
  {
    path: '/api/auth/[...nextauth]',
    methods: ['GET', 'POST'],
  },
  {
    path: '/api/auth/setup-account',
    methods: ['POST'],
  },
  {
    path: '/api/auth/2fa',
    methods: ['POST', 'PUT', 'PATCH'],
  },
  // Debugging route for troubleshooting
  {
    path: '/api/debug/auth-status',
    methods: ['GET'],
  },
];

// Convert route patterns to regex
const PUBLIC_API_PATTERNS = PUBLIC_API_ROUTES.map(route => ({
  pattern: new RegExp(`^${route.path.replace(/\[id\]/g, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').replace(/\//g, '\\/')}$`),
  methods: route.methods,
}));

// Check if a path and method match any of the public API patterns
const isPublicApiRoute = (path: string, method: string) => {
  // Special case for nextauth routes which use dynamic segments
  if (path.startsWith('/api/auth/')) {
    return true;
  }
  
  return PUBLIC_API_PATTERNS.some(({ pattern, methods }) => 
    pattern.test(path) && methods.includes(method)
  );
};

export async function middleware(request: NextRequest) {
  const session = await auth() as Session & { requiresTwoFactor?: boolean };
  console.log('Middleware Debug:', {
    path: request.nextUrl.pathname,
    session: {
      isAuth: !!session?.user,
      userId: session?.user?.id,
      role: session?.user?.role,
      requiresTwoFactor: session?.requiresTwoFactor
    }
  });

  const isAuth = !!session?.user;
  const isAuthPage = request.nextUrl.pathname.startsWith(ROUTES.AUTH);
  const isApiRoute = request.nextUrl.pathname.startsWith(ROUTES.API);
  const isAppRoute = request.nextUrl.pathname.startsWith(ROUTES.APP_ROOT);
  const isAppRoot = request.nextUrl.pathname === ROUTES.APP_ROOT;

  // Handle API routes first
  if (isApiRoute) {
    // Always allow access to auth-related API routes
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }
    
    // Allow access to public API routes with specific methods
    if (isPublicApiRoute(request.nextUrl.pathname, request.method)) {
      return NextResponse.next();
    }

    // Require authentication for other API routes
    if (!isAuth || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Handle auth pages (including register)
  if (isAuthPage) {
    // If user is already authenticated and doesn't require 2FA, redirect based on role
    if (isAuth && session.user?.id && !session.requiresTwoFactor) {
      const role = session.user.role;
      if (role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL(ROUTES.SUPER_ADMIN, request.url));
      } else if (role === 'COMPANY_ADMIN') {
        return NextResponse.redirect(new URL(ROUTES.COMPANY_ADMIN, request.url));
      } else {
        return NextResponse.redirect(new URL(ROUTES.EMPLOYEE + '/home', request.url));
      }
    }
    // Allow access to auth pages for unauthenticated users or users requiring 2FA
    return NextResponse.next();
  }

  // Allow unauthenticated access to the landing page
  if (
    !isAuth ||
    !session.user?.id ||
    session.requiresTwoFactor
  ) {
    if (request.nextUrl.pathname === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Handle app routes
  if (isAppRoute) {
    // Redirect /app based on role
    if (isAppRoot) {
      const role = session.user.role;
      if (role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL(ROUTES.SUPER_ADMIN, request.url));
      } else if (role === 'COMPANY_ADMIN') {
        return NextResponse.redirect(new URL(ROUTES.COMPANY_ADMIN, request.url));
      } else {
        return NextResponse.redirect(new URL(ROUTES.EMPLOYEE + '/home', request.url));
      }
    }

    // Check if the user is trying to access a protected route
    const path = request.nextUrl.pathname;
    
    // Allow access to reports page for all authenticated users
    if (path.startsWith('/app/employee/reports')) {
      return NextResponse.next();
    }
    
    if (path.startsWith(ROUTES.SUPER_ADMIN)) {
      if (session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL(ROUTES.EMPLOYEE, request.url));
      }
    } else if (path.startsWith(ROUTES.COMPANY_ADMIN)) {
      // Allow access if user is either SUPER_ADMIN or COMPANY_ADMIN
      if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'COMPANY_ADMIN') {
        return NextResponse.redirect(new URL(ROUTES.EMPLOYEE, request.url));
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except:
    // - Static files (_next/static, _next/image)
    // - Favicon
    // - Public files (public directory)
    "/((?!_next/static|_next/image|icon.svg|globe.svg|favicon.ico|public).*)",
  ],
};