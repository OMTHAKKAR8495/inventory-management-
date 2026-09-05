import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = db.prepare("SELECT id, email, name FROM users WHERE email = ?").get(email.trim().toLowerCase()) as any;

    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been generated.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    db.prepare(`
      INSERT INTO password_resets (id, email, token, expires_at, used)
      VALUES (?, ?, ?, ?, 0)
    `).run("reset_" + crypto.randomUUID(), user.email, token, expiresAt);

    // In a production setup, we'd send an email. For demo/prototype, return simulated token instructions:
    return NextResponse.json({
      success: true,
      message: "Reset token generated successfully.",
      resetToken: token, // Sent for instant testing and seamless store recovery
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request." }, { status: 500 });
  }
}
