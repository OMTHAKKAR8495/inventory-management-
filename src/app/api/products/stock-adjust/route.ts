import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqBody = await req.json();
    const productId = reqBody.productId?.toString().trim();
    const type = reqBody.type === "stock_out" ? "stock_out" : "stock_in";
    const quantity = Math.floor(Number(reqBody.quantity) || 0);
    const reason = reqBody.reason?.toString().trim();

    if (!productId || quantity <= 0) {
      return NextResponse.json(
        { error: "Product ID and a positive quantity greater than 0 are required." },
        { status: 400 }
      );
    }

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as any;
    if (!product) {
      return NextResponse.json({ error: `Product with ID '${productId}' not found in database.` }, { status: 404 });
    }

    const delta = type === "stock_in" ? quantity : -quantity;
    const currentStock = Math.max(0, Math.floor(Number(product.stock_quantity) || 0));
    const newQty = Math.max(0, currentStock + delta);
    const now = new Date().toISOString();

    const adjustTx = db.transaction(() => {
      db.prepare("UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?").run(newQty, now, productId);

      db.prepare(`
        INSERT INTO stock_logs (
          id, product_id, product_name, user_id, user_name,
          change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "log_" + Math.random().toString(36).substring(2, 9),
        productId,
        product.name,
        user.id,
        user.name,
        type === "stock_in" ? "stock_in" : "stock_out",
        delta,
        currentStock,
        newQty,
        reason || `${type === "stock_in" ? "Stock In (+)" : "Stock Out (-)"} adjustment by ${user.name}`,
        now
      );
    });

    adjustTx();

    const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as any;
    console.log(`[StockAdjust API] ✓ Successfully updated ${product.name} (ID: ${productId}): ${currentStock} -> ${newQty} (delta: ${delta})`);

    const derivedStatus = newQty <= 0 ? "out_of_stock" : newQty <= product.reorder_level ? "low_stock" : "in_stock";

    return NextResponse.json({
      success: true,
      product: {
        ...updatedProduct,
        stock_quantity: newQty,
        status: derivedStatus,
      },
      message: `Stock for '${product.name}' updated to ${newQty} units (${derivedStatus.replace(/_/g, " ").toUpperCase()}).`,
    });
  } catch (error: any) {
    console.error("Stock adjust error:", error);
    return NextResponse.json({ error: error.message || "Failed to adjust stock" }, { status: 500 });
  }
}
