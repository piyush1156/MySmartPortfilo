import { NextRequest, NextResponse } from "next/server";
import { generateOTP, storeOTP, isOwnerEmail, getOwnerEmail } from "@/lib/admin-auth";
import { sendOTPEmail } from "@/lib/mail";

// POST /api/auth/otp — Generate and send OTP via real email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // ✅ ONLY the owner email can access admin
    if (!isOwnerEmail(email)) {
      // Don't reveal that this email isn't the owner
      return NextResponse.json({
        success: true,
        message: "If this email is registered, an OTP has been sent.",
      });
    }

    const code = generateOTP();
    storeOTP(email, code);

    // Send real email via Gmail SMTP
    const result = await sendOTPEmail(email, code);

    if (!result.success) {
      console.error("Email send failed:", result.error);
      // Still return success to not reveal the error to the client
    }

    console.log(`\n🔐 OTP generated for ${email}: ${code}\n`);

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error("OTP generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate OTP" },
      { status: 500 }
    );
  }
}
