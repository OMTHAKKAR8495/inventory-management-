import { NextResponse } from "next/server";
import { queryOne, withTransaction } from "@/lib/cloudDb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Counter POS checkout is restricted to Store Administrator." },
        { status: 403 }
      );
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

    const cleanPhone = (customerPhone || "").replace(/\D/g, "");
    if (!customerPhone || !customerPhone.trim() || cleanPhone.length < 10) {
      return NextResponse.json(
        { error: "Customer mobile number is compulsory (valid 10-digit number required) to generate bill." },
        { status: 400 }
      );
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
      const product = await queryOne(
        "SELECT * FROM products WHERE id = ? AND deleted_at IS NULL",
        [item.productId]
      );

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

    let finalCustomerId = customerId || null;
    if (!finalCustomerId && customerPhone) {
      const cleanPhone = customerPhone.replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        const matched = await queryOne(
          "SELECT id FROM customers WHERE REPLACE(REPLACE(phone, ' ', ''), '-', '') LIKE ?",
          [`%${cleanPhone.slice(-10)}%`]
        );
        if (matched) {
          finalCustomerId = matched.id;
        }
      }
    }

    // Run transaction
    await withTransaction(async (tx) => {
      // 1. Insert Invoice
      await tx.execute(
        `
        INSERT INTO invoices (
          id, invoice_number, customer_id, customer_name, customer_phone,
          subtotal, discount_amount, tax_amount, grand_total,
          payment_method, payment_status, notes, created_by_id, created_by_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          invoiceId,
          invoiceNumber,
          finalCustomerId,
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
          now,
        ]
      );

      // 2. Insert Invoice Items, Deduct Stock, and Log
      for (const vi of validatedItems) {
        const itemId = `item_${Math.random().toString(36).substring(2, 10)}`;
        await tx.execute(
          `
          INSERT INTO invoice_items (
            id, invoice_id, product_id, product_name, sku, unit,
            unit_price, cost_price, quantity, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            itemId,
            invoiceId,
            vi.product.id,
            vi.product.name,
            vi.product.sku,
            vi.product.unit,
            vi.unitPrice,
            vi.costPrice,
            vi.quantity,
            vi.totalPrice,
          ]
        );

        await tx.execute(
          `
          UPDATE products
          SET stock_quantity = stock_quantity - ?, updated_at = ?
          WHERE id = ?
        `,
          [vi.quantity, now, vi.product.id]
        );

        await tx.execute(
          `
          INSERT INTO stock_logs (
            id, product_id, product_name, user_id, user_name,
            change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
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
            now,
          ]
        );
      }

      // 3. If registered customer, update customer balance and ledger
      if (finalCustomerId) {
        const customer = await tx.queryOne("SELECT * FROM customers WHERE id = ?", [finalCustomerId]);
        if (customer) {
          if (paymentMethod === "khata") {
            const newBal = Number((customer.current_balance + grandTotal).toFixed(2));
            await tx.execute(
              "UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?",
              [newBal, now, finalCustomerId]
            );

            await tx.execute(
              `
              INSERT INTO khata_transactions (
                id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
                payment_mode, notes, created_by_name, created_at
              ) VALUES (?, ?, ?, 'debit_purchase', ?, ?, ?, 'Credit / Khata', ?, ?, ?)
            `,
              [
                `ktx_${Math.random().toString(36).substring(2, 9)}`,
                finalCustomerId,
                invoiceId,
                grandTotal,
                customer.current_balance,
                newBal,
                `Khata Credit Bill #${invoiceNumber}`,
                user.name,
                now,
              ]
            );
          } else {
            // Instant Cash/UPI/Card paid purchase for customer: record in ledger history
            await tx.execute(
              `
              INSERT INTO khata_transactions (
                id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
                payment_mode, notes, created_by_name, created_at
              ) VALUES (?, ?, ?, 'paid_bill', ?, ?, ?, ?, ?, ?, ?)
            `,
              [
                `ktx_${Math.random().toString(36).substring(2, 9)}`,
                finalCustomerId,
                invoiceId,
                grandTotal,
                customer.current_balance,
                customer.current_balance,
                `${paymentMethod.toUpperCase()} Paid Bill #${invoiceNumber}`,
                user.name,
                now,
              ]
            );
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Invoice #${invoiceNumber} generated & inventory stock updated live!`,
      invoice: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        grand_total: grandTotal,
        customer_name: customerName,
        payment_method: paymentMethod,
        items_count: validatedItems.length,
        created_at: now,
      },
      updatedStock: validatedItems.map((vi) => {
        const remainingStock = vi.product.stock_quantity - vi.quantity;
        const minStock = vi.product.min_stock_level ?? 10;
        let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
        if (remainingStock <= 0) {
          status = "out_of_stock";
        } else if (remainingStock <= minStock) {
          status = "low_stock";
        }

        return {
          productId: vi.product.id,
          productName: vi.product.name,
          sku: vi.product.sku,
          unit: vi.product.unit,
          quantitySold: vi.quantity,
          previousStock: vi.product.stock_quantity,
          remainingStock: remainingStock,
          minStockLevel: minStock,
          status,
        };
      }),
    });
  } catch (err: any) {
    console.error("POS Checkout error:", err);
    return NextResponse.json({ error: err.message || "Failed to process sale" }, { status: 500 });
  }
}


