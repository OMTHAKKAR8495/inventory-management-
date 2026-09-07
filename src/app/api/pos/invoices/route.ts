import { NextResponse } from "next/server";
import { queryAll, queryOne, withTransaction } from "@/lib/cloudDb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Invoice archive access is restricted to Store Administrator." },
        { status: 403 }
      );
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

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Invoice update is restricted to Store Administrator." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      invoiceId,
      customerName,
      customerPhone,
      paymentMethod,
      paymentStatus,
      notes,
      items, // Optional updated items array: [{ productId, productName, sku, unit, quantity, unitPrice, costPrice, totalPrice }]
      discountAmount: rawDiscount,
      taxAmount: rawTax,
    } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    // 1. Fetch current invoice
    const existingInvoice = await queryOne("SELECT * FROM invoices WHERE id = ?", [invoiceId]);
    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const cleanPhone = (customerPhone || "").replace(/\D/g, "");
    const oldGrandTotal = Number(existingInvoice.grand_total || 0);
    const oldMethod = (existingInvoice.payment_method || "cash").toLowerCase();
    const oldStatus = (existingInvoice.payment_status || "paid").toLowerCase();
    const newMethod = (paymentMethod || oldMethod).toLowerCase();
    const newStatus = (paymentStatus || (newMethod === "khata" ? "unpaid" : "paid")).toLowerCase();

    await withTransaction(async (tx) => {
      // Find or associate customer if needed
      let customerId = existingInvoice.customer_id;
      if (!customerId && cleanPhone && cleanPhone.length >= 10) {
        const matched = await tx.queryOne(
          "SELECT id FROM customers WHERE REPLACE(REPLACE(phone, ' ', ''), '-', '') LIKE ?",
          [`%${cleanPhone.slice(-10)}%`]
        );
        if (matched) {
          customerId = matched.id;
        }
      }

      let finalSubtotal = Number(existingInvoice.subtotal || 0);
      let finalDiscount = rawDiscount !== undefined ? Number(rawDiscount) : Number(existingInvoice.discount_amount || 0);
      let finalTax = rawTax !== undefined ? Number(rawTax) : Number(existingInvoice.tax_amount || 0);
      let finalGrandTotal = oldGrandTotal;

      // Handle items modification & Stock adjustments
      if (items && Array.isArray(items) && items.length > 0) {
        const oldItems = await tx.queryAll(
          "SELECT * FROM invoice_items WHERE invoice_id = ?",
          [invoiceId]
        );

        // Map old quantities by product_id
        const oldQtyMap: Record<string, number> = {};
        for (const oi of oldItems) {
          oldQtyMap[oi.product_id] = (oldQtyMap[oi.product_id] || 0) + Number(oi.quantity);
        }

        // Map new quantities by product_id
        const newQtyMap: Record<string, number> = {};
        for (const ni of items) {
          const pid = ni.productId || ni.product_id;
          newQtyMap[pid] = (newQtyMap[pid] || 0) + Number(ni.quantity);
        }

        // Calculate all involved product IDs
        const allProductIds = Array.from(new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)]));

        // Adjust stock for each product
        for (const pid of allProductIds) {
          const oldQ = oldQtyMap[pid] || 0;
          const newQ = newQtyMap[pid] || 0;
          const delta = newQ - oldQ; // Positive = sold more (deduct stock), Negative = reduced/removed (restore stock)

          if (delta !== 0) {
            const product = await tx.queryOne("SELECT * FROM products WHERE id = ?", [pid]);
            if (product) {
              if (delta > 0 && product.stock_quantity < delta) {
                throw new Error(
                  `Insufficient stock for "${product.name}". Additional needed: ${delta} ${product.unit}, available: ${product.stock_quantity} ${product.unit}.`
                );
              }

              const updatedStock = product.stock_quantity - delta;
              await tx.execute(
                "UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?",
                [updatedStock, now, pid]
              );

              await tx.execute(
                `INSERT INTO stock_logs (
                  id, product_id, product_name, user_id, user_name,
                  change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  `log_${Math.random().toString(36).substring(2, 9)}`,
                  pid,
                  product.name,
                  user.id,
                  user.name,
                  delta > 0 ? "stock_out" : "stock_in",
                  -delta,
                  product.stock_quantity,
                  updatedStock,
                  `Edited Invoice #${existingInvoice.invoice_number} (Qty: ${oldQ} -> ${newQ})`,
                  now,
                ]
              );
            }
          }
        }

        // Delete old invoice items and insert new ones
        await tx.execute("DELETE FROM invoice_items WHERE invoice_id = ?", [invoiceId]);

        let calculatedSubtotal = 0;
        for (const item of items) {
          const itemId = item.id && !item.id.startsWith("item_") ? item.id : `item_${Math.random().toString(36).substring(2, 10)}`;
          const pid = item.productId || item.product_id;
          const pname = item.productName || item.product_name || item.name || "Item";
          const psku = item.sku || "";
          const punit = item.unit || "pcs";
          const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
          const costPrice = Number(item.costPrice ?? item.cost_price ?? 0);
          const qty = Number(item.quantity || 1);
          const itemTotal = Number((qty * unitPrice).toFixed(2));
          calculatedSubtotal += itemTotal;

          await tx.execute(
            `INSERT INTO invoice_items (
              id, invoice_id, product_id, product_name, sku, unit,
              unit_price, cost_price, quantity, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              itemId,
              invoiceId,
              pid,
              pname,
              psku,
              punit,
              unitPrice,
              costPrice,
              qty,
              itemTotal,
            ]
          );
        }

        finalSubtotal = Number(calculatedSubtotal.toFixed(2));
        finalGrandTotal = Math.max(0, Number((finalSubtotal - finalDiscount + finalTax).toFixed(2)));
      }

      // Handle Khata ledger balance transitions
      if (oldMethod === "khata" && newMethod !== "khata") {
        // Transition 1: Switched from Khata to Cash/UPI/Card -> Remove previous debt from Khata
        if (customerId) {
          const cust = await tx.queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
          if (cust) {
            const updatedBal = Math.max(0, Number((cust.current_balance - oldGrandTotal).toFixed(2)));
            await tx.execute("UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?", [
              updatedBal,
              now,
              customerId,
            ]);

            await tx.execute(
              `INSERT INTO khata_transactions (
                id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
                payment_mode, notes, created_by_name, created_at
              ) VALUES (?, ?, ?, 'payment_collection', ?, ?, ?, ?, ?, ?, ?)`,
              [
                `ktx_${Math.random().toString(36).substring(2, 9)}`,
                customerId,
                invoiceId,
                oldGrandTotal,
                cust.current_balance,
                updatedBal,
                `${newMethod.toUpperCase()} (Converted from Khata)`,
                `Bill #${existingInvoice.invoice_number} switched from Khata to ${newMethod.toUpperCase()} (${user.name})`,
                user.name,
                now,
              ]
            );
          }
        }
      } else if (oldMethod !== "khata" && newMethod === "khata") {
        // Transition 2: Switched from Cash/UPI to Khata -> Add new debt to Khata
        if (customerId) {
          const cust = await tx.queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
          if (cust) {
            const updatedBal = Number((cust.current_balance + finalGrandTotal).toFixed(2));
            await tx.execute("UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?", [
              updatedBal,
              now,
              customerId,
            ]);

            await tx.execute(
              `INSERT INTO khata_transactions (
                id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
                payment_mode, notes, created_by_name, created_at
              ) VALUES (?, ?, ?, 'debit_purchase', ?, ?, ?, 'Credit / Khata', ?, ?, ?)`,
              [
                `ktx_${Math.random().toString(36).substring(2, 9)}`,
                customerId,
                invoiceId,
                finalGrandTotal,
                cust.current_balance,
                updatedBal,
                `Bill #${existingInvoice.invoice_number} switched to Khata Credit (${user.name})`,
                user.name,
                now,
              ]
            );
          }
        }
      } else if (oldMethod === "khata" && newMethod === "khata" && finalGrandTotal !== oldGrandTotal) {
        // Transition 3: Remained on Khata, but items changed so Grand Total changed -> Adjust customer balance delta
        if (customerId) {
          const cust = await tx.queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
          if (cust) {
            const delta = finalGrandTotal - oldGrandTotal;
            const updatedBal = Math.max(0, Number((cust.current_balance + delta).toFixed(2)));
            await tx.execute("UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?", [
              updatedBal,
              now,
              customerId,
            ]);

            await tx.execute(
              `INSERT INTO khata_transactions (
                id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
                payment_mode, notes, created_by_name, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Credit / Khata', ?, ?, ?)`,
              [
                `ktx_${Math.random().toString(36).substring(2, 9)}`,
                customerId,
                invoiceId,
                delta > 0 ? "debit_purchase" : "payment_collection",
                Math.abs(delta),
                cust.current_balance,
                updatedBal,
                `Items updated in Khata Bill #${existingInvoice.invoice_number} (Delta: ₹${delta})`,
                user.name,
                now,
              ]
            );
          }
        }
      }

      // Update invoice table
      await tx.execute(
        `UPDATE invoices
         SET customer_id = ?, customer_name = ?, customer_phone = ?,
             subtotal = ?, discount_amount = ?, tax_amount = ?, grand_total = ?,
             payment_method = ?, payment_status = ?, notes = ?
         WHERE id = ?`,
        [
          customerId || null,
          customerName ? customerName.trim() : existingInvoice.customer_name,
          customerPhone ? customerPhone.trim() : existingInvoice.customer_phone,
          finalSubtotal,
          finalDiscount,
          finalTax,
          finalGrandTotal,
          newMethod,
          newStatus,
          notes !== undefined ? (notes ? notes.trim() : null) : existingInvoice.notes,
          invoiceId,
        ]
      );

      // Add audit log
      await tx.execute(
        `INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, entity_name, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `audit_${Math.random().toString(36).substring(2, 9)}`,
          user.id,
          user.name,
          "update",
          "invoice",
          invoiceId,
          existingInvoice.invoice_number,
          JSON.stringify({
            previous: {
              grand_total: oldGrandTotal,
              payment_method: oldMethod,
              payment_status: oldStatus,
              customer_name: existingInvoice.customer_name,
              customer_phone: existingInvoice.customer_phone,
            },
            updated: {
              grand_total: finalGrandTotal,
              payment_method: newMethod,
              payment_status: newStatus,
              customer_name: customerName,
              customer_phone: customerPhone,
            },
          }),
          now,
        ]
      );
    });

    const updated = await queryOne("SELECT * FROM invoices WHERE id = ?", [invoiceId]);
    const updatedItems = await queryAll("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC", [invoiceId]);

    return NextResponse.json({
      success: true,
      invoice: {
        ...updated,
        items: updatedItems,
      },
    });
  } catch (err: any) {
    console.error("Update invoice error:", err);
    return NextResponse.json({ error: err.message || "Failed to update invoice" }, { status: 500 });
  }
}

