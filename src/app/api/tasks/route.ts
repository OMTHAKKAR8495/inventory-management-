import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ShopfloorTask } from "@/lib/types";

// GET /api/tasks — Retrieve shopfloor tasks and pending count
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // all, pending, in_progress, completed
    const priority = searchParams.get("priority");

    let query = "SELECT * FROM shopfloor_tasks WHERE 1=1";
    const params: any[] = [];

    if (status && status !== "all") {
      query += " AND status = ?";
      params.push(status);
    }

    if (priority && priority !== "all") {
      query += " AND priority = ?";
      params.push(priority);
    }

    query += " ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, created_at DESC";

    const tasks = db.prepare(query).all(...params) as ShopfloorTask[];

    const pendingCount = (
      db.prepare("SELECT COUNT(*) as count FROM shopfloor_tasks WHERE status != 'completed'").get() as { count: number }
    )?.count || 0;

    const urgentCount = (
      db.prepare("SELECT COUNT(*) as count FROM shopfloor_tasks WHERE status != 'completed' AND priority = 'urgent'").get() as { count: number }
    )?.count || 0;

    return NextResponse.json({
      tasks,
      pendingCount,
      urgentCount,
    });
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: error.message || "Failed to load tasks" }, { status: 500 });
  }
}

// POST /api/tasks — Admin creates a new message / work order to Manager
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      priority = "normal",
      category = "general_work",
      relatedProductId,
      relatedProductName,
      notes,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title or message instruction is required" }, { status: 400 });
    }

    const taskId = "task_" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    let resolvedProductName = relatedProductName || null;
    if (relatedProductId && !resolvedProductName) {
      const prod = db.prepare("SELECT name FROM products WHERE id = ?").get(relatedProductId) as { name: string } | undefined;
      if (prod) resolvedProductName = prod.name;
    }

    db.prepare(`
      INSERT INTO shopfloor_tasks (
        id, title, description, priority, category, related_product_id,
        related_product_name, from_user_id, from_user_name, to_role, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      title.trim(),
      description ? description.trim() : null,
      priority,
      category,
      relatedProductId || null,
      resolvedProductName,
      user.id,
      user.name,
      "manager",
      "pending",
      notes ? notes.trim() : null,
      now
    );

    return NextResponse.json({
      success: true,
      message: "Work instruction dispatched to shopfloor manager successfully!",
      taskId,
    });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: error.message || "Failed to create task" }, { status: 500 });
  }
}

// PATCH /api/tasks — Update task status or add completion note
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, status, notes } = body;

    if (!taskId || !status) {
      return NextResponse.json({ error: "Task ID and new status are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const isCompleted = status === "completed";

    db.prepare(`
      UPDATE shopfloor_tasks
      SET status = ?,
          notes = COALESCE(?, notes),
          completed_at = CASE WHEN ? = 1 THEN ? ELSE completed_at END,
          completed_by_name = CASE WHEN ? = 1 THEN ? ELSE completed_by_name END
      WHERE id = ?
    `).run(
      status,
      notes || null,
      isCompleted ? 1 : 0,
      now,
      isCompleted ? 1 : 0,
      user.name,
      taskId
    );

    return NextResponse.json({
      success: true,
      message: `Task status updated to ${status.replace("_", " ")}`,
    });
  } catch (error: any) {
    console.error("PATCH /api/tasks error:", error);
    return NextResponse.json({ error: error.message || "Failed to update task" }, { status: 500 });
  }
}

