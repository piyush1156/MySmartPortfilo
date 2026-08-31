import { NextRequest, NextResponse } from "next/server";

// POST /api/auth/logout — Clear session
export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
    || request.headers.get("Authorization")?.replace("Bearer ", "");

  if (token) {
    // Delete session from store
    try {
      const { readFileSync, writeFileSync, existsSync } = await import("fs");
      const { join } = await import("path");
      const sessionFile = join(process.cwd(), "data", "admin-session.json");
      if (existsSync(sessionFile)) {
        const store = JSON.parse(readFileSync(sessionFile, "utf-8"));
        delete store[token];
        writeFileSync(sessionFile, JSON.stringify(store, null, 2), "utf-8");
      }
    } catch {}
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}
