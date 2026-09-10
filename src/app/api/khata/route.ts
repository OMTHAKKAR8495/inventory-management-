import { NextResponse } from "next/server";
import { queryAll, queryOne, execute, withTransaction } from "@/lib/cloudDb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");

    if (customerId) {
      const customer = await queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
      if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

      const transactions = await queryAll(
        "SELECT * FROM khata_transactions WHERE customer_id = ? ORDER BY created_at DESC",
        [customerId]
      );

      const invoices = await queryAll(
        "SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC",
        [customerId]
      );

      return NextResponse.json({ customer, transactions, invoices });
    }

    const customers = await queryAll(
      "SELECT * FROM customers ORDER BY current_balance DESC, name ASC"
    );
    const totalReceivable = customers.reduce(
      (sum, c) => sum + (c.current_balance > 0 ? c.current_balance : 0),
      0
    );

    return NextResponse.json({
      customers,
      totalReceivable: Number(totalReceivable.toFixed(2)),
      activeCount: customers.length,
    });
  } catch (err: any) {
    console.error("Khata fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch Khata data" }, { status: 500 });
  }
}

// Add new customer or record a payment received
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    // 1. Create Customer
    if (action === "create_customer") {
      const { name, storeName, phone, address, creditLimit = 50000, initialBalance = 0 } = body;
      if (!name || !storeName || !phone) {
        return NextResponse.json(
          { error: "Name, Store Name, and Phone are required." },
          { status: 400 }
        );
      }

      const id = `cust_${Math.random().toString(36).substring(2, 9)}`;
      await execute(
        `
        INSERT INTO customers (id, name, store_name, phone, address, credit_limit, current_balance, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          name.trim(),
          storeName.trim(),
          phone.trim(),
          address?.trim() || null,
          creditLimit,
          initialBalance,
          now,
          now,
        ]
      );

      if (initialBalance > 0) {
        await execute(
          `
          INSERT INTO khata_transactions (
            id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
            payment_mode, notes, created_by_name, created_at
          ) VALUES (?, ?, null, 'debit_purchase', ?, 0, ?, 'Opening Balance', 'Initial outstanding balance on setup', ?, ?)
        `,
          [
            `ktx_${Math.random().toString(36).substring(2, 9)}`,
            id,
            initialBalance,
            initialBalance,
            user.name,
            now,
          ]
        );
      }

      return NextResponse.json({
        success: true,
        message: `Customer "${storeName}" registered into Khata!`,
      });
    }

    // 2. Record Customer Payment (Khata Settlement)
    if (action === "record_payment") {
      const { customerId, amount, paymentMode = "UPI / Cash", notes } = body;
      if (!customerId || !amount || amount <= 0) {
        return NextResponse.json(
          { error: "Valid customer and payment amount are required." },
          { status: 400 }
        );
      }

      const customer = await queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
      if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

      const prevBal = customer.current_balance;
      const newBal = Number((prevBal - amount).toFixed(2));

      await withTransaction(async (tx) => {
        await tx.execute(
          "UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?",
          [newBal, now, customerId]
        );

        await tx.execute(
          `
          INSERT INTO khata_transactions (
            id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
            payment_mode, notes, created_by_name, created_at
          ) VALUES (?, ?, null, 'credit_payment', ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            `ktx_${Math.random().toString(36).substring(2, 9)}`,
            customerId,
            amount,
            prevBal,
            newBal,
            paymentMode,
            notes?.trim() || "Payment received & credited to Khata",
            user.name,
            now,
          ]
        );
      });

      return NextResponse.json({
        success: true,
        message: `Payment of ₹${amount.toLocaleString("en-IN")} received! Updated balance: ₹${newBal.toLocaleString("en-IN")}.`,
      });
    }

    // 3. Delete Customer / Khata Account
    if (action === "delete_customer") {
      const { customerId } = body;
      if (!customerId) {
        return NextResponse.json({ error: "Customer ID is required." }, { status: 400 });
      }

      const customer = await queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }

      await withTransaction(async (tx) => {
        await tx.execute("DELETE FROM khata_transactions WHERE customer_id = ?", [customerId]);
        await tx.execute("UPDATE invoices SET customer_id = NULL WHERE customer_id = ?", [customerId]);
        await tx.execute("DELETE FROM customers WHERE id = ?", [customerId]);
      });

      return NextResponse.json({
        success: true,
        message: `Khata account for "${customer.store_name}" (${customer.name}) deleted successfully.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Khata action error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process Khata action" },
      { status: 500 }
    );
  }
}

// DELETE /api/khata?customerId=xyz - Delete customer & khata account
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId") || searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required." }, { status: 400 });
    }

    const customer = await queryOne("SELECT * FROM customers WHERE id = ?", [customerId]);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await withTransaction(async (tx) => {
      // 1. Delete associated Khata ledger transactions
      await tx.execute("DELETE FROM khata_transactions WHERE customer_id = ?", [customerId]);

      // 2. Dissociate customer from any past invoices to keep financial history safe
      await tx.execute("UPDATE invoices SET customer_id = NULL WHERE customer_id = ?", [customerId]);

      // 3. Delete the customer record
      await tx.execute("DELETE FROM customers WHERE id = ?", [customerId]);
    });

    return NextResponse.json({
      success: true,
      message: `Khata account for "${customer.store_name}" (${customer.name}) deleted successfully.`,
    });
  } catch (err: any) {
    console.error("Khata delete error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete Khata" },
      { status: 500 }
    );
  }
}

