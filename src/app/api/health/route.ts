import { NextResponse } from "next/server";
import { queryOne, queryAll, pool } from "@/lib/cloudDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  try {
    // 1. Run quick connectivity query
    const dbCheck = await queryOne<{ now: string; version: string }>(
      "SELECT NOW() as now, version() as version"
    );

    // 2. Count users and products
    const [userCountRecord, productCountRecord] = await Promise.all([
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM public.users"),
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM public.products"),
    ]);

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      database: {
        engine: pool ? "Supabase Cloud PostgreSQL" : "Local SQLite",
        connected: true,
        latencyMs,
        serverTime: dbCheck?.now,
        userCount: Number(userCountRecord?.count || 0),
        productCount: Number(productCountRecord?.count || 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        database: {
          engine: pool ? "Supabase Cloud PostgreSQL" : "Local SQLite",
          connected: false,
          latencyMs,
          error: error.message || "Database connection error",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
