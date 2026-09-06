import { NextResponse } from "next/server";
import { queryOne, withTransaction } from "@/lib/cloudDb";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Token and new password (min 6 chars) are required." },
        { status: 400 }
      );
    }

    const resetRecord = await queryOne<{
      id: string;
      email: string;
      expires_at: string;
      used: number;
    }>(
      `
      SELECT id, email, expires_at, used
      FROM password_resets
      WHERE token = ? AND used = 0
    `,
      [token]
    );

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "Reset token has expired." }, { status: 400 });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);

    await withTransaction(async (tx) => {
      await tx.execute("UPDATE users SET password_hash = ? WHERE email = ?", [
        newHash,
        resetRecord.email,
      ]);
      await tx.execute("UPDATE password_resets SET used = 1 WHERE id = ?", [resetRecord.id]);
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}

