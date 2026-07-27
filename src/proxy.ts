import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/trpc (tRPC API routes — auth checked per-procedure)
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - login / forgot-password / reset-password / signup / verify-email (public auth pages)
     * - privacy / terms (public legal pages)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|forgot-password|reset-password|signup|verify-email|privacy|terms).*)",
  ],
};
