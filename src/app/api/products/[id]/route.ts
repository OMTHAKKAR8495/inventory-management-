import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Product, StockStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const logs = db
      .prepare("SELECT * FROM stock_logs WHERE product_id = ? ORDER BY created_at DESC LIMIT 20")
      .all(id);

    const isAdmin = user.role === "admin";
    const profit = Number((product.selling_price - product.cost_price).toFixed(2));
    const marginPct = product.cost_price > 0 ? Number(((profit / product.cost_price) * 100).toFixed(1)) : 0;

    let stockStatus: StockStatus = "in_stock";
    if (product.stock_quantity <= 0) stockStatus = "out_of_stock";
    else if (product.stock_quantity <= product.reorder_level) stockStatus = "low_stock";

    return NextResponse.json({
      product: {
        ...product,
        status: stockStatus,
        cost_price: isAdmin ? product.cost_price : 0,
        profit_margin: isAdmin ? profit : undefined,
        profit_margin_percent: isAdmin ? marginPct : undefined,
        stock_cost_value: isAdmin ? Number((product.cost_price * product.stock_quantity).toFixed(2)) : undefined,
        stock_sales_value: Number((product.selling_price * product.stock_quantity).toFixed(2)),
      },
      logs,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get product" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await req.json();

    // Check if this is a Restore action from Recycle Bin (Admin only)
    if (body.restore) {
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: Admin access required to restore products." }, { status: 403 });
      }

      const restoreTx = db.transaction(() => {
        db.prepare("UPDATE products SET deleted_at = NULL, updated_at = ? WHERE id = ?").run(
          new Date().toISOString(),
          id
        );

        db.prepare(`
          INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "log_" + Math.random().toString(36).substring(2, 9),
          id,
          existing.name,
          user.id,
          user.name,
          "product_restored",
          0,
          existing.stock_quantity,
          existing.stock_quantity,
          `Restored product '${existing.name}' from Recycle Bin by ${user.name}`,
          new Date().toISOString()
        );
      });

      restoreTx();

      return NextResponse.json({
        success: true,
        message: `Product '${existing.name}' restored successfully to active catalog.`,
      });
    }

    const {
      sku,
      barcode,
      name,
      category,
      sub_category,
      unit,
      bulk_pack_size,
      cost_price,
      selling_price,
      stock_quantity,
      reorder_level,
      supplier,
      expiry_date,
    } = body;

    const newSku = sku ? sku.trim() : existing.sku;
    const newBarcode = barcode !== undefined ? barcode?.trim() || null : existing.barcode;
    const newName = name ? name.trim() : existing.name;
    const newCategory = category ? category.trim() : existing.category;
    const newSubCategory = sub_category !== undefined ? sub_category : existing.sub_category;
    const newUnit = unit ? unit.trim() : existing.unit;
    const newBulkPackSize = bulk_pack_size !== undefined ? parseInt(bulk_pack_size, 10) : existing.bulk_pack_size;
    
    const newCostPrice = user.role === "admin" && cost_price !== undefined 
      ? parseFloat(cost_price) 
      : existing.cost_price;
      
    const newSellingPrice = selling_price !== undefined ? parseFloat(selling_price) : existing.selling_price;
    const newStockQty = stock_quantity !== undefined ? Math.max(0, Math.floor(Number(stock_quantity) || 0)) : existing.stock_quantity;
    const newReorderLevel = reorder_level !== undefined ? Math.max(0, Math.floor(Number(reorder_level) || 10)) : existing.reorder_level;
    const newSupplier = supplier !== undefined ? supplier : existing.supplier;
    const newExpiry = expiry_date !== undefined ? expiry_date : existing.expiry_date;
    const now = new Date().toISOString();

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE products SET
          sku = ?,
          barcode = ?,
          name = ?,
          category = ?,
          sub_category = ?,
          unit = ?,
          bulk_pack_size = ?,
          cost_price = ?,
          selling_price = ?,
          stock_quantity = ?,
          reorder_level = ?,
          supplier = ?,
          expiry_date = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        newSku,
        newBarcode,
        newName,
        newCategory,
        newSubCategory,
        newUnit,
        newBulkPackSize,
        newCostPrice,
        newSellingPrice,
        newStockQty,
        newReorderLevel,
        newSupplier,
        newExpiry,
        now,
        id
      );

      if (newStockQty !== existing.stock_quantity) {
        const delta = newStockQty - existing.stock_quantity;
        db.prepare(`
          INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "log_" + Math.random().toString(36).substring(2, 9),
          id,
          newName,
          user.id,
          user.name,
          "manual_adjustment",
          delta,
          existing.stock_quantity,
          newStockQty,
          `Stock updated via edit form (${existing.stock_quantity} -> ${newStockQty})`,
          now
        );
      } else {
        db.prepare(`
          INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "log_" + Math.random().toString(36).substring(2, 9),
          id,
          newName,
          user.id,
          user.name,
          "product_edited",
          0,
          existing.stock_quantity,
          newStockQty,
          `Product specifications updated by ${user.name}`,
          now
        );
      }
    });

    updateTx();

    const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any;
    console.log(`[Products PUT API] ✓ Successfully saved product '${newName}' (ID: ${id}) with stock: ${newStockQty}`);

    const derivedStatus = newStockQty <= 0 ? "out_of_stock" : newStockQty <= newReorderLevel ? "low_stock" : "in_stock";

    return NextResponse.json({
      success: true,
      product: {
        ...updated,
        stock_quantity: newStockQty,
        status: derivedStatus,
      },
      message: `Product '${newName}' updated successfully.`,
    });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Only Administrators can delete products." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const purge = searchParams.get("purge") === "true"; // permanent purge

    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    const deleteTx = db.transaction(() => {
      if (purge) {
        // Permanent deletion from database
        db.prepare(`
          INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "log_" + Math.random().toString(36).substring(2, 9),
          id,
          existing.name,
          user.id,
          user.name,
          "product_deleted",
          -existing.stock_quantity,
          existing.stock_quantity,
          0,
          `Permanently purged product '${existing.name}' by Administrator ${user.name}`,
          now
        );

        db.prepare("DELETE FROM products WHERE id = ?").run(id);
      } else {
        // Soft delete (moved to recycle bin)
        db.prepare("UPDATE products SET deleted_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);

        db.prepare(`
          INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "log_" + Math.random().toString(36).substring(2, 9),
          id,
          existing.name,
          user.id,
          user.name,
          "product_deleted",
          0,
          existing.stock_quantity,
          existing.stock_quantity,
          `Moved '${existing.name}' to Recycle Bin by ${user.name}`,
          now
        );
      }
    });

    deleteTx();

    return NextResponse.json({
      success: true,
      message: purge
        ? `Product '${existing.name}' permanently deleted.`
        : `Product '${existing.name}' moved to Recycle Bin (can be restored anytime).`,
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete product" }, { status: 500 });
  }
}
