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
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const search = searchParams.get("search")?.trim() || "";
    const customerId = searchParams.get("customer_id");

    const startDate = searchParams.get("start_date")?.trim();
    const endDate = searchParams.get("end_date")?.trim();
    const date = searchParams.get("date")?.trim();

    let query = "SELECT * FROM invoices WHERE 1=1";
    const params: any[] = [];

    if (search) {
      query += " AND (invoice_number ILIKE ? OR customer_name ILIKE ? OR customer_phone ILIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (customerId) {
      query += " AND customer_id = ?";
      params.push(customerId);
    }

    if (date) {
      query += " AND created_at::text LIKE ?";
      params.push(`${date}%`);
    } else {
      if (startDate) {
        query += " AND created_at >= ?";
        params.push(`${startDate} 00:00:00`);
      }
      if (endDate) {
        query += " AND created_at <= ?";
        params.push(`${endDate} 23:59:59`);
      }
    }

    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);

    const invoices = await queryAll(query, params);

    if (invoices.length === 0) {
      return NextResponse.json({ invoices: [] });
    }

    // Attach items for each invoice
    const invoiceIds = invoices.map((inv) => inv.id);
    const placeholders = invoiceIds.map(() => "?").join(",");
    const allItems = await queryAll(
      `SELECT * FROM invoice_items WHERE invoice_id IN (${placeholders}) ORDER BY id ASC`,
      invoiceIds
    );

    const itemsByInvoiceId: Record<string, any[]> = {};
    for (const item of allItems) {
      if (!itemsByInvoiceId[item.invoice_id]) {
        itemsByInvoiceId[item.invoice_id] = [];
      }
      itemsByInvoiceId[item.invoice_id].push(item);
    }

    const result = invoices.map((inv) => ({
      ...inv,
      items: itemsByInvoiceId[inv.id] || [],
    }));

    return NextResponse.json({ invoices: result });
  } catch (err: any) {
    console.error("Fetch invoices error:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

