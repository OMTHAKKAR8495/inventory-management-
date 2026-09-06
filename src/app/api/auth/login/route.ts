import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne, execute } from "@/lib/cloudDb";
import { setAuthCookie, signToken } from "@/lib/auth";
import { User } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = new Date();

    // Check rate limit / lockout
    const attemptRecord = await queryOne<{
      attempts: number;
      last_attempt: string;
      locked_until: string | null;
    }>(
      "SELECT attempts, last_attempt, locked_until FROM login_attempts WHERE ip_or_email = ?",
      [cleanEmail]
    );

    if (attemptRecord?.locked_until && new Date(attemptRecord.locked_until) > now) {
      const remainingMinutes = Math.ceil(
        (new Date(attemptRecord.locked_until).getTime() - now.getTime()) / 60000
      );
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${remainingMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    const row = await queryOne<User & { password_hash: string }>(
      "SELECT id, name, email, password_hash, role, status, created_at FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (!row) {
      await recordFailedAttempt(cleanEmail, attemptRecord);
      return NextResponse.json(
        { error: "Invalid credentials. Please check your email and password." },
        { status: 401 }
      );
    }

    if (row.status !== "active") {
      return NextResponse.json(
        { error: "Your account is deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    const isValid = bcrypt.compareSync(password, row.password_hash);
    if (!isValid) {
      const currentAttempts = await recordFailedAttempt(cleanEmail, attemptRecord);
      const remaining = MAX_FAILED_ATTEMPTS - currentAttempts;
      return NextResponse.json(
        {
          error: `Invalid credentials.${
            remaining > 0
              ? ` ${remaining} attempt(s) remaining before lockout.`
              : " Account locked for 15 minutes."
          }`,
        },
        { status: 401 }
      );
    }

    // Reset failed attempts on success
    await execute("DELETE FROM login_attempts WHERE ip_or_email = ?", [cleanEmail]);

    const token = await signToken({
      userId: row.id,
      email: row.email,
      role: row.role,
      name: row.name,
    });

    const userProfile: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      created_at: row.created_at,
    };

    const response = NextResponse.json({
      success: true,
      user: userProfile,
      message: `Welcome back, ${row.name}!`,
    });

    const cookieOptions = setAuthCookie(token);
    response.cookies.set(cookieOptions);

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred during login." },
      { status: 500 }
    );
  }
}

async function recordFailedAttempt(
  key: string,
  existing?: { attempts: number; last_attempt: string; locked_until: string | null } | null
): Promise<number> {
  const now = new Date();
  const attempts = (existing?.attempts || 0) + 1;
  const lockedUntil =
    attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(now.getTime() + LOCKOUT_DURATION_MS).toISOString()
      : null;

  await execute(
    `
    INSERT INTO login_attempts (ip_or_email, attempts, last_attempt, locked_until)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(ip_or_email) DO UPDATE SET
      attempts = excluded.attempts,
      last_attempt = excluded.last_attempt,
      locked_until = excluded.locked_until
  `,
    [key, attempts, now.toISOString(), lockedUntil]
  );

  return attempts;
}

