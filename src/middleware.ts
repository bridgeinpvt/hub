import { NextRequest } from "next/server";
import { authMiddleware } from "@/lib/shared-auth-middleware";

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    authDomain: "localhost:3001",
    currentDomain: "localhost:3000", 
    cookieDomain: "localhost",
    publicPaths: ["/", "/public"],
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
