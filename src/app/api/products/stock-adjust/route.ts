import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, type, quantity, reason } = await req.json();

    if (!productId || !type || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Product ID, adjustment type (stock_in/stock_out), and positive quantity are required." },
        { status: 400 }
      );
    }

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as any;
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const delta = type === "stock_in" ? Math.abs(quantity) : -Math.abs(quantity);
    const newQty = Math.max(0, product.stock_quantity + delta);
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
        product.stock_quantity,
        newQty,
        reason?.trim() || `${type === "stock_in" ? "Stock added" : "Stock removed"} by ${user.name}`,
        now
      );
    });

    adjustTx();

    const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: `Stock for '${product.name}' updated to ${newQty} units.`,
    });
  } catch (error: any) {
    console.error("Stock adjust error:", error);
    return NextResponse.json({ error: error.message || "Failed to adjust stock" }, { status: 500 });
  }
}
