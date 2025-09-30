import { NextRequest, NextResponse } from "next/server";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  capsuleEnrolled: boolean;
  businessEnrolled: boolean;
}

export interface AuthConfig {
  authDomain: string;
  currentDomain: string;
  requiredEnrollment?: 'capsule' | 'business';
  publicPaths?: string[];
  cookieDomain: string;
}

/**
 * Validates authentication token by calling the central auth service
 */
export async function validateAuthToken(token: string, authDomain: string): Promise<AuthUser | null> {
  try {
    const response = await fetch(`http://${authDomain}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Auth token validation failed:', error);
    return null;
  }
}

/**
 * Checks if the current path is public (doesn't require authentication)
 */
export function isPublicPath(pathname: string, publicPaths: string[] = []): boolean {
  const defaultPublicPaths = [
    '/api/auth',
    '/auth/signin',
    '/auth/signup',
    '/auth/error',
    '/login',
    '/register',
    '/public',
    '/_next',
    '/favicon.ico',
  ];

  const allPublicPaths = [...defaultPublicPaths, ...publicPaths];

  return allPublicPaths.some(path =>
    pathname.startsWith(path) || pathname === path
  );
}

/**
 * Checks if user has required enrollment for the current app
 */
export function hasRequiredEnrollment(user: AuthUser, requiredEnrollment?: 'capsule' | 'business'): boolean {
  if (!requiredEnrollment) return true;

  if (requiredEnrollment === 'capsule') {
    return user.capsuleEnrolled;
  }

  if (requiredEnrollment === 'business') {
    return user.businessEnrolled;
  }

  return true;
}

/**
 * Main authentication middleware function
 */
export async function authMiddleware(request: NextRequest, config: AuthConfig): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Skip authentication for public paths
  if (isPublicPath(pathname, config.publicPaths)) {
    return null; // Continue to next middleware/handler
  }

  // Get authentication token from cookies
  const authToken = request.cookies.get('nocage-auth')?.value;

  if (!authToken) {
    // Redirect to auth service for login
    const callbackUrl = encodeURIComponent(request.url);
    const loginUrl = `http://${config.authDomain}/api/auth/signin?callbackUrl=${callbackUrl}`;
    return NextResponse.redirect(loginUrl);
  }

  // Validate token with auth service
  const user = await validateAuthToken(authToken, config.authDomain);

  if (!user) {
    // Invalid token, redirect to login
    const callbackUrl = encodeURIComponent(request.url);
    const loginUrl = `http://${config.authDomain}/api/auth/signin?callbackUrl=${callbackUrl}`;
    return NextResponse.redirect(loginUrl);
  }

  // Check if user has required enrollment
  if (!hasRequiredEnrollment(user, config.requiredEnrollment)) {
    // User doesn't have required enrollment, redirect to enrollment page
    const enrollmentUrl = `http://${config.authDomain}/enroll?app=${config.requiredEnrollment}&callbackUrl=${encodeURIComponent(request.url)}`;
    return NextResponse.redirect(enrollmentUrl);
  }

  // User is authenticated and has required enrollment
  // Add user info to request headers for use in the app
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

/**
 * Helper function to get user info from request headers (to be used in API routes/components)
 */
export function getUserFromHeaders(headers: Headers): AuthUser | null {
  const userId = headers.get('x-user-id');
  const userEmail = headers.get('x-user-email');

  if (!userId || !userEmail) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
    name: headers.get('x-user-name') || undefined,
    image: undefined, // Not passed through headers for security
    capsuleEnrolled: headers.get('x-user-capsule-enrolled') === 'true',
    businessEnrolled: headers.get('x-user-business-enrolled') === 'true',
  };
}

/**
 * Utility function to create logout URL that clears cookies across domains
 */
export function createLogoutUrl(authDomain: string, callbackUrl?: string): string {
  const callback = callbackUrl || window.location.origin;
  return `http://${authDomain}/api/auth/signout?callbackUrl=${encodeURIComponent(callback)}`;
}

/**
 * Utility function to create login URL with callback
 */
export function createLoginUrl(authDomain: string, callbackUrl?: string): string {
  const callback = callbackUrl || window.location.href;
  return `http://${authDomain}/api/auth/signin?callbackUrl=${encodeURIComponent(callback)}`;
}