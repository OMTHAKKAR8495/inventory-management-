import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No product items provided." }, { status: 400 });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const errors: { row: number; item: string; error: string }[] = [];
    const now = new Date().toISOString();

    const checkSkuStmt = db.prepare("SELECT id, name, stock_quantity, cost_price FROM products WHERE sku = ?");
    const insertStmt = db.prepare(`
      INSERT INTO products (
        id, sku, name, category, sub_category, unit, bulk_pack_size,
        cost_price, selling_price, stock_quantity, reorder_level,
        supplier, expiry_date, created_at, updated_at
      ) VALUES (
        @id, @sku, @name, @category, @sub_category, @unit, @bulk_pack_size,
        @cost_price, @selling_price, @stock_quantity, @reorder_level,
        @supplier, @expiry_date, @created_at, @updated_at
      )
    `);

    const updateStmt = db.prepare(`
      UPDATE products SET
        name = @name,
        category = @category,
        sub_category = @sub_category,
        unit = @unit,
        bulk_pack_size = @bulk_pack_size,
        cost_price = @cost_price,
        selling_price = @selling_price,
        stock_quantity = stock_quantity + @stock_quantity,
        reorder_level = @reorder_level,
        supplier = @supplier,
        expiry_date = @expiry_date,
        updated_at = @updated_at
      WHERE id = @id
    `);

    const logStmt = db.prepare(`
      INSERT INTO stock_logs (
        id, product_id, product_name, user_id, user_name,
        change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const bulkTx = db.transaction(() => {
      items.forEach((item: any, index: number) => {
        try {
          const name = item.name?.toString().trim();
          const category = (item.category?.toString().trim()) || "General Provision";
          const unit = (item.unit?.toString().trim()) || "Piece";
          const subCategory = item.sub_category?.toString().trim() || null;
          const bulkPackSize = Math.max(1, parseInt(item.bulk_pack_size || "1", 10) || 1);
          const costPrice = Math.max(0, parseFloat(item.cost_price || "0") || 0);
          const sellingPrice = Math.max(0, parseFloat(item.selling_price || "0") || 0);
          const stockQuantity = parseInt(item.stock_quantity || "0", 10) || 0;
          const reorderLevel = parseInt(item.reorder_level || "10", 10) || 10;
          const supplier = item.supplier?.toString().trim() || null;
          const expiryDate = item.expiry_date?.toString().trim() || null;

          if (!name) {
            errors.push({ row: index + 1, item: "Unnamed Row", error: "Product name is required." });
            return;
          }

          let sku = item.sku?.toString().trim();
          if (!sku) {
            const prefix = category.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "PRD");
            sku = `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
          }

          const existing = checkSkuStmt.get(sku) as any;

          if (existing) {
            // Update existing product and add stock
            updateStmt.run({
              id: existing.id,
              name,
              category,
              sub_category: subCategory,
              unit,
              bulk_pack_size: bulkPackSize,
              cost_price: user.role === "admin" ? costPrice : existing.cost_price,
              selling_price: sellingPrice > 0 ? sellingPrice : existing.selling_price,
              stock_quantity: stockQuantity,
              reorder_level: reorderLevel,
              supplier,
              expiry_date: expiryDate,
              updated_at: now,
            });

            logStmt.run(
              "log_" + Math.random().toString(36).substring(2, 9),
              existing.id,
              name,
              user.id,
              user.name,
              "bulk_import",
              stockQuantity,
              existing.stock_quantity,
              existing.stock_quantity + stockQuantity,
              `Bulk upload update (+${stockQuantity} units)`,
              now
            );
            updatedCount++;
          } else {
            const newId = "prod_" + Math.random().toString(36).substring(2, 9);
            insertStmt.run({
              id: newId,
              sku,
              name,
              category,
              sub_category: subCategory,
              unit,
              bulk_pack_size: bulkPackSize,
              cost_price: costPrice,
              selling_price: sellingPrice,
              stock_quantity: stockQuantity,
              reorder_level: reorderLevel,
              supplier,
              expiry_date: expiryDate,
              created_at: now,
              updated_at: now,
            });

            logStmt.run(
              "log_" + Math.random().toString(36).substring(2, 9),
              newId,
              name,
              user.id,
              user.name,
              "bulk_import",
              stockQuantity,
              0,
              stockQuantity,
              `Bulk import created product (${stockQuantity} initial units)`,
              now
            );
            insertedCount++;
          }
        } catch (rowErr: any) {
          errors.push({
            row: index + 1,
            item: item.name || `Row #${index + 1}`,
            error: rowErr.message || "Invalid row format",
          });
        }
      });
    });

    bulkTx();

    return NextResponse.json({
      success: true,
      insertedCount,
      updatedCount,
      totalProcessed: items.length,
      errors,
      message: `Bulk processing completed. ${insertedCount} added, ${updatedCount} updated${errors.length > 0 ? `, ${errors.length} failed` : ""}.`,
    });
  } catch (error: any) {
    console.error("Bulk upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to process bulk upload" }, { status: 500 });
  }
}
