import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, createSession, isOwnerEmail, verifySession } from "@/lib/admin-auth";

// POST /api/auth/verify — Verify OTP and create session
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    if (!isOwnerEmail(email)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = verifyOTP(email, code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    const token = createSession(email);

    const response = NextResponse.json({
      success: true,
      token,
      message: "Login successful",
    });

    // Set httpOnly cookie for extra security
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

// GET /api/auth/verify — Check if current session is valid
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
    || request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const valid = verifySession(token);
  if (!valid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
