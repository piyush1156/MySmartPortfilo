import { NextRequest, NextResponse } from "next/server";

// Routes that require admin authentication
const ADMIN_ROUTES = ["/admin"];
const PROTECTED_API_ROUTES = [
  "/api/visitors",      // GET requires auth (POST is public for visitor logging)
  "/api/chat-history",  // GET requires auth (POST is public for chat recording)
];

// Token cookie name
const TOKEN_COOKIE = "admin_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  // ── Protect /admin page ────────────────────────────────
  const isAdminPage = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isAdminPage) {
    // No token cookie → redirect to home
    if (!token) {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }
    // Token exists → let the page's client-side verify it with the server
    // (middleware can't read the session file on Edge, but the API routes do full verification)
  }

  // ── Protect API routes that need auth on GET ───────────
  const isProtectedApi = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedApi && request.method === "GET") {
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match /admin and /admin/*
    "/admin",
    "/admin/:path*",
    // Match protected API GET requests
    "/api/visitors",
    "/api/chat-history",
  ],
};
