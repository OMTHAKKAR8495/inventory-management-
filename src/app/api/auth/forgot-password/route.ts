import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/cloudDb";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await queryOne<{ id: string; email: string; name: string }>(
      "SELECT id, email, name FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been generated.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    await execute(
      `
      INSERT INTO password_resets (id, email, token, expires_at, used)
      VALUES (?, ?, ?, ?, 0)
    `,
      ["reset_" + crypto.randomUUID(), user.email, token, expiresAt]
    );

    return NextResponse.json({
      success: true,
      message: "Reset token generated successfully.",
      resetToken: token,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request." }, { status: 500 });
  }
}

