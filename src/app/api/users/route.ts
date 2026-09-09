import { NextResponse } from "next/server";
import { queryAll, queryOne, execute } from "@/lib/cloudDb";
import { getCurrentUser, invalidateUserCache } from "@/lib/auth";
import { User } from "@/lib/types";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const users = await queryAll(
      "SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC"
    );
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch staff users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "All fields (name, email, password, role) are required." },
        { status: 400 }
      );
    }

    const existing = await queryOne("SELECT id FROM users WHERE email = ?", [
      email.trim().toLowerCase(),
    ]);
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
    }

    const hash = bcrypt.hashSync(password, 10);
    const newId = "usr_" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(
      `
      INSERT INTO users (id, name, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `,
      [newId, name.trim(), email.trim().toLowerCase(), hash, role, now]
    );

    return NextResponse.json({
      success: true,
      message: `User '${name}' created successfully as ${role}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}

// PATCH /api/users — Toggle / change staff member active status (e.g. deactivate on departure)
export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { userId, status } = await req.json();

    if (!userId || !status) {
      return NextResponse.json({ error: "User ID and status are required." }, { status: 400 });
    }

    if (!["active", "deactivated", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    const targetUser = await queryOne<User>(
      "SELECT id, name, email, role, status FROM users WHERE id = ?",
      [userId]
    );
    if (!targetUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    // Safety guard: prevent admin from deactivating their own active account
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own active Administrator session." },
        { status: 400 }
      );
    }

    // Safety guard: prevent deactivating the only active admin in the store
    if (targetUser.role === "admin" && status !== "active") {
      const otherAdmins = await queryAll<User>(
        "SELECT id FROM users WHERE role = 'admin' AND status = 'active' AND id != ?",
        [userId]
      );
      if (otherAdmins.length === 0) {
        return NextResponse.json(
          { error: "Cannot deactivate the only active Administrator account in the store." },
          { status: 400 }
        );
      }
    }

    await execute("UPDATE users SET status = ? WHERE id = ?", [status, userId]);
    invalidateUserCache(userId);

    const isDeactivated = status === "deactivated" || status === "inactive";
    return NextResponse.json({
      success: true,
      message: isDeactivated
        ? `Account for '${targetUser.name}' has been deactivated. They can no longer log in.`
        : `Account for '${targetUser.name}' has been reactivated. Access restored!`,
      user: { ...targetUser, status },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update user status" }, { status: 500 });
  }
}

// DELETE /api/users — Permanently delete an employee record (Admin only)
export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot delete your own active Administrator account." },
        { status: 400 }
      );
    }

    const targetUser = await queryOne<User>(
      "SELECT id, name, role FROM users WHERE id = ?",
      [userId]
    );
    if (!targetUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    await execute("DELETE FROM users WHERE id = ?", [userId]);
    invalidateUserCache(userId);

    return NextResponse.json({
      success: true,
      message: `Staff record '${targetUser.name}' has been removed from the system.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}

