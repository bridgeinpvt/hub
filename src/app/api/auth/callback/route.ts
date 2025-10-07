import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authToken = req.nextUrl.searchParams.get("auth_token");

    if (!authToken) {
      return NextResponse.redirect(
        new URL("/", req.url)
      );
    }

    // Validate token with auth service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
    const validateResponse = await fetch(`${authServiceUrl}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: authToken }),
    });

    if (!validateResponse.ok) {
      console.error("Token validation failed");
      return NextResponse.redirect(
        new URL(`${authServiceUrl}/login`, req.url)
      );
    }

    // Token is valid, set cookie and redirect
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    };

    // Get redirect destination or default to home
    const redirectPath = req.nextUrl.searchParams.get("redirect") || "/";
    const redirectUrl = new URL(redirectPath, req.url);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.set("nocage-auth", authToken, cookieOptions);

    return response;
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
