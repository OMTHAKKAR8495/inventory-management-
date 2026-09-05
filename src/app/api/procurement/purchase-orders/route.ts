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
    const supplier = searchParams.get("supplier");

    let query = "SELECT * FROM purchase_orders WHERE 1=1";
    const params: any[] = [];

    if (supplier) {
      query += " AND supplier_name = ?";
      params.push(supplier);
    }

    query += " ORDER BY created_at DESC";

    const pos = db.prepare(query).all(...params) as any[];
    const getItems = db.prepare("SELECT * FROM purchase_order_items WHERE po_id = ?");

    const result = pos.map((po) => ({
      ...po,
      items: getItems.all(po.id),
    }));

    return NextResponse.json({ purchaseOrders: result });
  } catch (err: any) {
    console.error("Fetch POs error:", err);
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

// Generate PO from low-stock items or create custom PO
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Action 1: Auto-generate POs grouped by supplier for all low-stock items
    if (action === "auto_generate") {
      const lowStockProducts = db
        .prepare(`
          SELECT * FROM products
          WHERE stock_quantity <= reorder_level
            AND deleted_at IS NULL
          ORDER BY supplier ASC, name ASC
        `)
        .all() as any[];

      if (lowStockProducts.length === 0) {
        return NextResponse.json(
          { message: "All products are currently well-stocked. No purchase orders needed!" },
          { status: 200 }
        );
      }

      // Group by supplier
      const supplierMap: Record<string, any[]> = {};
      for (const p of lowStockProducts) {
        const supp = p.supplier?.trim() || "General Supplier";
        if (!supplierMap[supp]) supplierMap[supp] = [];
        supplierMap[supp].push(p);
      }

      const createdOrders: any[] = [];
      const now = new Date().toISOString();

      const tx = db.transaction(() => {
        for (const [suppName, prodList] of Object.entries(supplierMap)) {
          const poId = `po_${Math.random().toString(36).substring(2, 9)}`;
          const poNumber = `PO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;

          let totalEstAmount = 0;
          const itemsToInsert: any[] = [];

          for (const prod of prodList) {
            // Suggest ordering up to 3x reorder level or minimum 25 units
            const targetStock = Math.max(prod.reorder_level * 3, 30);
            const reorderQty = Math.max(targetStock - prod.stock_quantity, 10);
            const itemEstCost = reorderQty * prod.cost_price;
            totalEstAmount += itemEstCost;

            itemsToInsert.push({
              id: `poi_${Math.random().toString(36).substring(2, 9)}`,
              poId,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              currentStock: prod.stock_quantity,
              reorderQuantity: reorderQty,
              estimatedUnitCost: prod.cost_price,
              totalEstimatedCost: itemEstCost,
            });
          }

          db.prepare(`
            INSERT INTO purchase_orders (
              id, po_number, supplier_name, total_estimated_amount, status,
              items_count, notes, created_by_id, created_by_name, created_at
            ) VALUES (?, ?, ?, ?, 'draft', ?, 'Auto-generated from low stock threshold scanner', ?, ?, ?)
          `).run(poId, poNumber, suppName, totalEstAmount, itemsToInsert.length, user.id, user.name, now);

          const insertItem = db.prepare(`
            INSERT INTO purchase_order_items (
              id, po_id, product_id, product_name, sku,
              current_stock, reorder_quantity, estimated_unit_cost, total_estimated_cost
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const item of itemsToInsert) {
            insertItem.run(
              item.id,
              item.poId,
              item.productId,
              item.productName,
              item.sku,
              item.currentStock,
              item.reorderQuantity,
              item.estimatedUnitCost,
              item.totalEstimatedCost
            );
          }

          createdOrders.push({ poNumber, supplier: suppName, itemsCount: itemsToInsert.length, totalAmount: totalEstAmount });
        }
      });

      tx();

      return NextResponse.json({
        success: true,
        message: `Successfully generated ${createdOrders.length} Supplier Purchase Orders!`,
        orders: createdOrders,
      });
    }

    // Action 2: Mark PO as Received & Auto-Restock Warehouse
    if (action === "receive_shipment") {
      const { poId } = body;
      const po = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(poId) as any;
      if (!po) return NextResponse.json({ error: "PO not found" }, { status: 404 });
      if (po.status === "received") {
        return NextResponse.json({ error: "This purchase order has already been received into stock." }, { status: 400 });
      }

      const items = db.prepare("SELECT * FROM purchase_order_items WHERE po_id = ?").all(poId) as any[];
      const now = new Date().toISOString();

      const receiveTx = db.transaction(() => {
        db.prepare("UPDATE purchase_orders SET status = 'received', received_at = ? WHERE id = ?").run(now, poId);

        const updateStock = db.prepare(`
          UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?
        `);

        const insertLog = db.prepare(`
          INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, 'stock_in', ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          const currentProd = db.prepare("SELECT stock_quantity FROM products WHERE id = ?").get(item.product_id) as any;
          if (currentProd) {
            const prev = currentProd.stock_quantity;
            const next = prev + item.reorder_quantity;
            updateStock.run(item.reorder_quantity, now, item.product_id);
            insertLog.run(
              `log_${Math.random().toString(36).substring(2, 9)}`,
              item.product_id,
              item.product_name,
              user.id,
              user.name,
              item.reorder_quantity,
              prev,
              next,
              `Received PO #${po.po_number} from ${po.supplier_name}`,
              now
            );
          }
        }
      });

      receiveTx();

      return NextResponse.json({
        success: true,
        message: `PO #${po.po_number} marked as Received! Added ${items.reduce((s, i) => s + i.reorder_quantity, 0)} units into catalog.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("PO Action error:", err);
    return NextResponse.json({ error: err.message || "Failed to process PO action" }, { status: 500 });
  }
}
