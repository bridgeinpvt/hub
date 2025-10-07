import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/lib/shared-auth-middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow root page and public assets to be public
  const publicPaths = [
    "/manifest.webmanifest",
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml",
  ];

  // Check for exact match on root or startsWith for other public paths
  if (pathname === "/" || publicPaths.some(path => pathname === path || pathname.startsWith(path)) || pathname.startsWith("/public/")) {
    return NextResponse.next();
  }

  // Allow auth callback endpoint without authentication
  if (pathname === "/api/auth/callback") {
    return NextResponse.next();
  }

  // If auth_token is in URL, validate and set cookie directly
  const authTokenFromUrl = request.nextUrl.searchParams.get("auth_token");
  if (authTokenFromUrl && !pathname.startsWith("/api")) {
    // Validate token with auth service
    try {
      const response = await fetch(`http://localhost:3001/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authTokenFromUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.user;

        // Remove auth_token from URL
        const cleanUrl = new URL(request.url);
        cleanUrl.searchParams.delete("auth_token");

        // Create response with redirect to clean URL
        const redirectResponse = NextResponse.redirect(cleanUrl.toString());

        // Set cookie
        redirectResponse.cookies.set("nocage-auth", authTokenFromUrl, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        });

        // Add user info to headers for this request
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', user.id);
        requestHeaders.set('x-user-email', user.email);
        requestHeaders.set('x-user-name', user.name || '');
        requestHeaders.set('x-user-capsule-enrolled', user.capsuleEnrolled.toString());
        requestHeaders.set('x-user-business-enrolled', user.businessEnrolled.toString());

        return redirectResponse;
      }
    } catch (error) {
      console.error('Token validation failed:', error);
    }

    // If validation fails, remove token from URL and continue
    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete("auth_token");
    return NextResponse.redirect(cleanUrl.toString());
  }

  // For API routes, validate token but don't redirect (just add headers or return 401)
  if (pathname.startsWith("/api")) {
    const authToken = request.cookies.get('nocage-auth')?.value;

    if (!authToken) {
      // For API routes without token, still let them through but without user headers
      // The API route itself can decide to return 401
      return NextResponse.next();
    }

    // Validate token with auth service
    try {
      const response = await fetch(`http://localhost:3001/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.user;

        // Add user info to request headers
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', user.id);
        requestHeaders.set('x-user-email', user.email);
        requestHeaders.set('x-user-name', user.name || '');
        requestHeaders.set('x-user-capsule-enrolled', user.capsuleEnrolled.toString());
        requestHeaders.set('x-user-business-enrolled', user.businessEnrolled.toString());

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    } catch (error) {
      console.error('Token validation error:', error);
    }

    // If validation fails, continue without headers
    return NextResponse.next();
  }

  // For page routes, use full auth middleware with redirects
  return authMiddleware(request, {
    authDomain: "localhost:3001",
    currentDomain: "localhost:3000",
    cookieDomain: "localhost",
    publicPaths: [],
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.ico).*)"],
};
