import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const search = searchParams.get("search")?.trim() || "";
    const customerId = searchParams.get("customer_id");

    let query = "SELECT * FROM invoices WHERE 1=1";
    const params: any[] = [];

    if (search) {
      query += " AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (customerId) {
      query += " AND customer_id = ?";
      params.push(customerId);
    }

    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);

    const invoices = db.prepare(query).all(...params) as any[];

    // Attach items
    const getItems = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
    const result = invoices.map((inv) => ({
      ...inv,
      items: getItems.all(inv.id),
    }));

    return NextResponse.json({ invoices: result });
  } catch (err: any) {
    console.error("Fetch invoices error:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
