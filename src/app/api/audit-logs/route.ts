import { NextResponse } from "next/server";
import { queryAll } from "@/lib/cloudDb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const changeType = searchParams.get("change_type") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    let query = "SELECT * FROM stock_logs WHERE 1=1";
    const params: any[] = [];

    if (search) {
      query +=
        " AND (LOWER(product_name) LIKE ? OR LOWER(user_name) LIKE ? OR LOWER(COALESCE(reason, '')) LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (changeType && changeType !== "all") {
      query += " AND change_type = ?";
      params.push(changeType);
    }

    query += " ORDER BY created_at DESC";

    const allLogs = await queryAll(query, params);
    const total = allLogs.length;
    const startIndex = (page - 1) * limit;
    const logs = allLogs.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

