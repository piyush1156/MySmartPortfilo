import nodemailer from "nodemailer";

// Gmail SMTP configuration
// User needs to:
// 1. Enable 2FA on Google Account
// 2. Generate an App Password at https://myaccount.google.com/apppasswords
// 3. Set Gmail credentials in .env.local:
//    Gmail_USER=your-email@gmail.com
//    Gmail_PASS=your-app-password

const Gmail_USER = process.env.Gmail_USER || "";
const Gmail_PASS = process.env.Gmail_PASS || "";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!Gmail_USER || !Gmail_PASS) {
    console.warn("⚠️ Gmail credentials not configured. OTP will be logged to console only.");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: Gmail_USER,
      pass: Gmail_PASS, // App Password, NOT regular password
    },
  });

  return transporter;
}

export async function sendOTPEmail(
  toEmail: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const transport = getTransporter();

  if (!transport) {
    // No email configured — log to console
    console.log(`\n╔═══════════════════════════════════════╗`);
    console.log(`║       ADMIN LOGIN OTP                 ║`);
    console.log(`║  To: ${toEmail.padEnd(32)}║`);
    console.log(`║  Code: ${code.padEnd(30)}║`);
    console.log(`║  Expires: 10 minutes                  ║`);
    console.log(`╚═══════════════════════════════════════╝\n`);
    return { success: true };
  }

  try {
    await transport.sendMail({
      from: `"Portfolio Admin" <${Gmail_USER}>`,
      to: toEmail,
      subject: `Your Admin Login Code: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0a0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:420px;margin:40px auto;padding:40px;background:#101113;border-radius:20px;border:1px solid rgba(255,255,255,0.06);">
            <!-- Logo -->
            <div style="text-align:center;margin-bottom:32px;">
              <div style="width:48px;height:48px;margin:0 auto;background:linear-gradient(135deg,#f59e0b,#ea580c);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;color:white;">◆</div>
            </div>
            
            <!-- Title -->
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f7f8f8;text-align:center;">Admin Login</h1>
            <p style="margin:0 0 32px;font-size:13px;color:#8a8f98;text-align:center;">Enter this code to access your admin portal</p>
            
            <!-- OTP Code -->
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
              <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#f7f8f8;font-family:monospace;">${code}</div>
            </div>
            
            <!-- Info -->
            <div style="text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#62666d;">This code expires in <strong style="color:#8a8f98;">10 minutes</strong></p>
              <p style="margin:0;font-size:12px;color:#62666d;">Do not share this code with anyone</p>
            </div>
            
            <!-- Footer -->
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:11px;color:#444850;">If you didn't request this, ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`✅ OTP email sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error: "Failed to send email" };
  }
}
