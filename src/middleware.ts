import { NextRequest } from "next/server";
import { authMiddleware } from "./lib/shared-auth-middleware";

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    authDomain: process.env.AUTH_DOMAIN || "localhost:3001",
    currentDomain: process.env.HUB_DOMAIN || "localhost:3000",
    // No required enrollment for hub - accessible to all users
    cookieDomain: process.env.COOKIE_DOMAIN || "localhost",
    publicPaths: [
      "/api/auth",
      "/auth",
      "/login",
      "/register",
      "/",
      "/home",
      "/about",
      "/contact",
      "/discover",
      "/marketplace",
    ],
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};