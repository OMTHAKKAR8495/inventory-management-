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

    const body = await req.json();
    const {
      invoiceId,
      customerName,
      customerPhone,
      paymentMethod,
      paymentStatus,
      notes,
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
    const grandTotal = Number(existingInvoice.grand_total || 0);
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

      // Handle Khata ledger balance transitions if payment method or status changed:
      // Transition 1: From Khata (Credit) to Cash/UPI/Card (Paid)
      if (oldMethod === "khata" && newMethod !== "khata") {
        if (customerId) {
          const cust = await tx.queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
          if (cust) {
            const updatedBal = Math.max(0, Number((cust.current_balance - grandTotal).toFixed(2)));
            await tx.execute("UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?", [
              updatedBal,
              now,
              customerId,
            ]);

            // Add payment collection log in khata_transactions
            await tx.execute(
              `INSERT INTO khata_transactions (
                id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
                payment_mode, notes, created_by_name, created_at
              ) VALUES (?, ?, ?, 'payment_collection', ?, ?, ?, ?, ?, ?, ?)`,
              [
                `ktx_${Math.random().toString(36).substring(2, 9)}`,
                customerId,
                invoiceId,
                grandTotal,
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
      }
      // Transition 2: From Cash/UPI/Card (Paid) to Khata (Credit)
      else if (oldMethod !== "khata" && newMethod === "khata") {
        if (customerId) {
          const cust = await tx.queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
          if (cust) {
            const updatedBal = Number((cust.current_balance + grandTotal).toFixed(2));
            await tx.execute("UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?", [
              updatedBal,
              now,
              customerId,
            ]);

            // Add debit transaction log in khata_transactions
            await tx.execute(
              `INSERT INTO khata_transactions (
                id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
                payment_mode, notes, created_by_name, created_at
              ) VALUES (?, ?, ?, 'debit_purchase', ?, ?, ?, 'Credit / Khata', ?, ?, ?)`,
              [
                `ktx_${Math.random().toString(36).substring(2, 9)}`,
                customerId,
                invoiceId,
                grandTotal,
                cust.current_balance,
                updatedBal,
                `Bill #${existingInvoice.invoice_number} switched from ${oldMethod.toUpperCase()} to Khata Credit (${user.name})`,
                user.name,
                now,
              ]
            );
          }
        }
      }
      // Transition 3: Switching between Cash and UPI (or Card)
      else if (oldMethod !== "khata" && newMethod !== "khata" && oldMethod !== newMethod) {
        if (customerId) {
          // Log payment mode switch in Khata history if customer exists
          await tx.execute(
            `INSERT INTO khata_transactions (
              id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
              payment_mode, notes, created_by_name, created_at
            ) VALUES (?, ?, ?, 'paid_bill', ?, ?, ?, ?, ?, ?, ?)`,
            [
              `ktx_${Math.random().toString(36).substring(2, 9)}`,
              customerId,
              invoiceId,
              grandTotal,
              0,
              0,
              `${newMethod.toUpperCase()} (Changed from ${oldMethod.toUpperCase()})`,
              `Payment method updated to ${newMethod.toUpperCase()} for Bill #${existingInvoice.invoice_number}`,
              user.name,
              now,
            ]
          );
        }
      }

      // Update invoice table
      await tx.execute(
        `UPDATE invoices
         SET customer_id = ?, customer_name = ?, customer_phone = ?,
             payment_method = ?, payment_status = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          customerId || null,
          customerName ? customerName.trim() : existingInvoice.customer_name,
          customerPhone ? customerPhone.trim() : existingInvoice.customer_phone,
          newMethod,
          newStatus,
          notes !== undefined ? (notes ? notes.trim() : null) : existingInvoice.notes,
          now,
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
              payment_method: oldMethod,
              payment_status: oldStatus,
              customer_name: existingInvoice.customer_name,
              customer_phone: existingInvoice.customer_phone,
            },
            updated: {
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
    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: any) {
    console.error("Update invoice error:", err);
    return NextResponse.json({ error: err.message || "Failed to update invoice" }, { status: 500 });
  }
}

