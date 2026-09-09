import { NextResponse } from "next/server";
import { queryAll, queryOne, execute, withTransaction } from "@/lib/cloudDb";
import { getCurrentUser } from "@/lib/auth";
import { StockLog, Product } from "@/lib/types";

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

    const isAdmin = user.role === "admin";

    let query = "SELECT * FROM stock_logs WHERE 1=1";
    const params: any[] = [];

    // For managers: Only show inward stock additions/restocks and never sales or customer purchases
    if (!isAdmin) {
      query += " AND (change_type IN ('stock_in', 'bulk_import', 'product_created') OR quantity_delta > 0) AND (reason IS NULL OR (LOWER(reason) NOT LIKE '%pos sale%' AND LOWER(reason) NOT LIKE '%bill%'))";
    }

    if (search) {
      query +=
        " AND (LOWER(product_name) LIKE ? OR LOWER(user_name) LIKE ? OR LOWER(COALESCE(reason, '')) LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (changeType && changeType !== "all") {
      if (!isAdmin && changeType === "stock_out") {
        return NextResponse.json({
          logs: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
      }
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

// POST /api/audit-logs — Admin resolves/corrects a mistaken stock movement entry
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only Store Administrator can resolve stock movement entries." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { logId, resolutionType, targetProductId, customQuantity, reasonNotes } = body;

    if (!logId) {
      return NextResponse.json({ error: "Log ID is required" }, { status: 400 });
    }

    const log = await queryOne<StockLog>("SELECT * FROM stock_logs WHERE id = ?", [logId]);
    if (!log) {
      return NextResponse.json({ error: "Stock log record not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (resolutionType === "revert") {
      await withTransaction(async (tx) => {
        const prod = await tx.queryOne<Product>("SELECT * FROM products WHERE id = ?", [log.product_id]);
        if (!prod) throw new Error("Affected product not found");

        const prevStock = prod.stock_quantity;
        const newStock = Math.max(0, prevStock - log.quantity_delta);

        await tx.execute("UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?", [
          newStock,
          now,
          prod.id,
        ]);

        await tx.execute(
          `INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "log_" + Math.random().toString(36).substring(2, 9),
            prod.id,
            prod.name,
            user.id,
            user.name,
            "manual_adjustment",
            -log.quantity_delta,
            prevStock,
            newStock,
            `Admin Correction: Reverted mistaken entry (${log.quantity_delta > 0 ? "+" : ""}${log.quantity_delta})${reasonNotes ? ` • Note: ${reasonNotes}` : ""}`,
            now,
          ]
        );

        await tx.execute(
          "UPDATE stock_logs SET reason = ? WHERE id = ?",
          [`${log.reason || "Entry"} [RESOLVED: Reverted by ${user.name}]`, logId]
        );
      });

      return NextResponse.json({
        success: true,
        message: `Successfully reverted mistaken entry on ${log.product_name}. Stock restored!`,
      });
    } else if (resolutionType === "transfer") {
      if (!targetProductId) {
        return NextResponse.json({ error: "Intended target product is required for transfer" }, { status: 400 });
      }

      await withTransaction(async (tx) => {
        const prodA = await tx.queryOne<Product>("SELECT * FROM products WHERE id = ?", [log.product_id]);
        const prodB = await tx.queryOne<Product>("SELECT * FROM products WHERE id = ?", [targetProductId]);
        if (!prodA) throw new Error("Original product not found");
        if (!prodB) throw new Error("Intended target product not found");

        // 1. Revert delta on original product
        const prevStockA = prodA.stock_quantity;
        const newStockA = Math.max(0, prevStockA - log.quantity_delta);
        await tx.execute("UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?", [
          newStockA,
          now,
          prodA.id,
        ]);

        await tx.execute(
          `INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "log_" + Math.random().toString(36).substring(2, 9),
            prodA.id,
            prodA.name,
            user.id,
            user.name,
            "manual_adjustment",
            -log.quantity_delta,
            prevStockA,
            newStockA,
            `Admin Correction: Reverted ${log.quantity_delta > 0 ? "+" : ""}${log.quantity_delta} (was meant for ${prodB.name})${reasonNotes ? ` • Note: ${reasonNotes}` : ""}`,
            now,
          ]
        );

        // 2. Apply delta to intended product
        const prevStockB = prodB.stock_quantity;
        const newStockB = Math.max(0, prevStockB + log.quantity_delta);
        await tx.execute("UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?", [
          newStockB,
          now,
          prodB.id,
        ]);

        await tx.execute(
          `INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "log_" + Math.random().toString(36).substring(2, 9),
            prodB.id,
            prodB.name,
            user.id,
            user.name,
            log.change_type === "stock_in" ? "stock_in" : "manual_adjustment",
            log.quantity_delta,
            prevStockB,
            newStockB,
            `Admin Correction: Applied intended ${log.quantity_delta > 0 ? "+" : ""}${log.quantity_delta} transferred from mistaken entry on ${prodA.name}`,
            now,
          ]
        );

        await tx.execute(
          "UPDATE stock_logs SET reason = ? WHERE id = ?",
          [`${log.reason || "Entry"} [RESOLVED: Transferred to ${prodB.name} by ${user.name}]`, logId]
        );
      });

      return NextResponse.json({
        success: true,
        message: `Successfully resolved! Reverted ${log.product_name} and transferred ${log.quantity_delta > 0 ? "+" : ""}${log.quantity_delta} to intended product!`,
      });
    } else if (resolutionType === "adjust") {
      const targetQty = Number(customQuantity);
      if (isNaN(targetQty) || targetQty < 0) {
        return NextResponse.json({ error: "Valid target quantity is required" }, { status: 400 });
      }

      await withTransaction(async (tx) => {
        const prod = await tx.queryOne<Product>("SELECT * FROM products WHERE id = ?", [log.product_id]);
        if (!prod) throw new Error("Product not found");

        const prevStock = prod.stock_quantity;
        const delta = targetQty - prevStock;

        await tx.execute("UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?", [
          targetQty,
          now,
          prod.id,
        ]);

        await tx.execute(
          `INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "log_" + Math.random().toString(36).substring(2, 9),
            prod.id,
            prod.name,
            user.id,
            user.name,
            "manual_adjustment",
            delta,
            prevStock,
            targetQty,
            `Admin Correction: Reconciled physical stock to ${targetQty}${reasonNotes ? ` • Note: ${reasonNotes}` : ""}`,
            now,
          ]
        );

        await tx.execute(
          "UPDATE stock_logs SET reason = ? WHERE id = ?",
          [`${log.reason || "Entry"} [RESOLVED: Reconciled to ${targetQty} by ${user.name}]`, logId]
        );
      });

      return NextResponse.json({
        success: true,
        message: `Successfully reconciled stock for ${log.product_name} to ${targetQty} units!`,
      });
    } else {
      return NextResponse.json({ error: "Invalid resolution type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("POST /api/audit-logs error:", error);
    return NextResponse.json({ error: error.message || "Failed to resolve log mistake" }, { status: 500 });
  }
}


