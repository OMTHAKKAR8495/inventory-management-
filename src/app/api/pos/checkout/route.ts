import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerId,
      customerName,
      customerPhone,
      items,
      discountAmount = 0,
      taxAmount = 0,
      paymentMethod = "cash",
      notes = "",
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items in billing cart" }, { status: 400 });
    }

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoiceId = `inv_${Math.random().toString(36).substring(2, 10)}`;

    let subtotal = 0;
    const validatedItems: Array<{
      product: any;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      totalPrice: number;
    }> = [];

    // Pre-validate all items and stock
    for (const item of items) {
      const product = db
        .prepare("SELECT * FROM products WHERE id = ? AND deleted_at IS NULL")
        .get(item.productId) as any;

      if (!product) {
        return NextResponse.json(
          { error: `Product ID "${item.productId}" not found in active catalog.` },
          { status: 400 }
        );
      }

      if (product.stock_quantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity} ${product.unit}, Requested: ${item.quantity}.`,
          },
          { status: 400 }
        );
      }

      const itemTotal = Number((item.quantity * product.selling_price).toFixed(2));
      subtotal += itemTotal;

      validatedItems.push({
        product,
        quantity: Number(item.quantity),
        unitPrice: product.selling_price,
        costPrice: product.cost_price,
        totalPrice: itemTotal,
      });
    }

    const grandTotal = Math.max(0, Number((subtotal - discountAmount + taxAmount).toFixed(2)));
    const paymentStatus = paymentMethod === "khata" ? "unpaid" : "paid";

    // Run transaction
    const checkoutTransaction = db.transaction(() => {
      // 1. Insert Invoice
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_id, customer_name, customer_phone,
          subtotal, discount_amount, tax_amount, grand_total,
          payment_method, payment_status, notes, created_by_id, created_by_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId,
        invoiceNumber,
        customerId || null,
        customerName.trim(),
        customerPhone?.trim() || null,
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        paymentMethod,
        paymentStatus,
        notes?.trim() || null,
        user.id,
        user.name,
        now
      );

      // 2. Insert Invoice Items, Deduct Stock, and Log
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, product_id, product_name, sku, unit,
          unit_price, cost_price, quantity, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE products
        SET stock_quantity = stock_quantity - ?, updated_at = ?
        WHERE id = ?
      `);

      const insertStockLog = db.prepare(`
        INSERT INTO stock_logs (
          id, product_id, product_name, user_id, user_name,
          change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const vi of validatedItems) {
        const itemId = `item_${Math.random().toString(36).substring(2, 10)}`;
        insertItem.run(
          itemId,
          invoiceId,
          vi.product.id,
          vi.product.name,
          vi.product.sku,
          vi.product.unit,
          vi.unitPrice,
          vi.costPrice,
          vi.quantity,
          vi.totalPrice
        );

        updateStock.run(vi.quantity, now, vi.product.id);

        insertStockLog.run(
          `log_${Math.random().toString(36).substring(2, 9)}`,
          vi.product.id,
          vi.product.name,
          user.id,
          user.name,
          "stock_out",
          -vi.quantity,
          vi.product.stock_quantity,
          vi.product.stock_quantity - vi.quantity,
          `POS Sale #${invoiceNumber} (${customerName.trim()})`,
          now
        );
      }

      // 3. If Khata/Credit, update customer balance and ledger
      if (paymentMethod === "khata" && customerId) {
        const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId) as any;
        if (customer) {
          const newBal = Number((customer.current_balance + grandTotal).toFixed(2));
          db.prepare("UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?").run(
            newBal,
            now,
            customerId
          );

          db.prepare(`
            INSERT INTO khata_transactions (
              id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
              payment_mode, notes, created_by_name, created_at
            ) VALUES (?, ?, ?, 'debit_purchase', ?, ?, ?, 'Credit / Khata', ?, ?, ?)
          `).run(
            `ktx_${Math.random().toString(36).substring(2, 9)}`,
            customerId,
            invoiceId,
            grandTotal,
            customer.current_balance,
            newBal,
            `Billed on Invoice #${invoiceNumber}`,
            user.name,
            now
          );
        }
      }
    });

    checkoutTransaction();

    return NextResponse.json({
      success: true,
      message: `Invoice #${invoiceNumber} generated & inventory updated successfully!`,
      invoice: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        grand_total: grandTotal,
        customer_name: customerName,
        payment_method: paymentMethod,
        items_count: validatedItems.length,
        created_at: now,
      },
    });
  } catch (err: any) {
    console.error("POS Checkout error:", err);
    return NextResponse.json({ error: err.message || "Failed to process sale" }, { status: 500 });
  }
}
