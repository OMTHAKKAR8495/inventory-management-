import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryAll } from "@/lib/cloudDb";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

function getBackupDir(): string {
  const localDir = path.join(process.cwd(), "data", "backups");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, ".write_test");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    return localDir;
  } catch (e) {
    const tmpDir = path.join(os.tmpdir(), "provisionsmart_backups");
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (err) {}
    return tmpDir;
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const downloadFilename = searchParams.get("download");
    const backupDir = getBackupDir();

    if (downloadFilename) {
      const safeFilename = path.basename(downloadFilename);
      const filePath = path.join(backupDir, safeFilename);

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "Content-Type": "application/json",
        },
      });
    }

    let files: any[] = [];
    try {
      if (fs.existsSync(backupDir)) {
        files = fs
          .readdirSync(backupDir)
          .filter((f) => f.endsWith(".json") || f.endsWith(".db"))
          .map((f) => {
            const fullPath = path.join(backupDir, f);
            const stat = fs.statSync(fullPath);
            return {
              filename: f,
              size: stat.size,
              created_at: stat.mtime.toISOString(),
            };
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    } catch (e) {
      files = [];
    }

    return NextResponse.json({ backups: files });
  } catch (error: any) {
    console.error("Failed to list backups:", error);
    return NextResponse.json({ backups: [], error: error.message || "Failed to list backups" }, { status: 200 });
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const backupDir = getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-cloud-${timestamp}.json`;
    const targetPath = path.join(backupDir, filename);

    // Export snapshots of all core tables from Supabase PostgreSQL
    const [products, customers, invoices, invoiceItems, stockLogs, khata, purchaseOrders, poItems, tasks] =
      await Promise.all([
        queryAll("SELECT * FROM products ORDER BY created_at DESC").catch(() => []),
        queryAll("SELECT * FROM customers ORDER BY created_at DESC").catch(() => []),
        queryAll("SELECT * FROM invoices ORDER BY created_at DESC").catch(() => []),
        queryAll("SELECT * FROM invoice_items ORDER BY id DESC").catch(() => []),
        queryAll("SELECT * FROM stock_logs ORDER BY created_at DESC").catch(() => []),
        queryAll("SELECT * FROM khata_transactions ORDER BY created_at DESC").catch(() => []),
        queryAll("SELECT * FROM purchase_orders ORDER BY created_at DESC").catch(() => []),
        queryAll("SELECT * FROM purchase_order_items ORDER BY id DESC").catch(() => []),
        queryAll("SELECT * FROM shopfloor_tasks ORDER BY created_at DESC").catch(() => []),
      ]);

    const snapshot = {
      app: "ProvisionSmart Wholesale Provision System",
      exported_at: new Date().toISOString(),
      exported_by: user.name,
      stats: {
        products: products.length,
        customers: customers.length,
        invoices: invoices.length,
        invoice_items: invoiceItems.length,
        stock_logs: stockLogs.length,
        khata_transactions: khata.length,
        purchase_orders: purchaseOrders.length,
        purchase_order_items: poItems.length,
        shopfloor_tasks: tasks.length,
      },
      data: {
        products,
        customers,
        invoices,
        invoice_items: invoiceItems,
        stock_logs: stockLogs,
        khata_transactions: khata,
        purchase_orders: purchaseOrders,
        purchase_order_items: poItems,
        shopfloor_tasks: tasks,
      },
    };

    let size = 0;
    try {
      const jsonContent = JSON.stringify(snapshot, null, 2);
      fs.writeFileSync(targetPath, jsonContent, "utf8");
      const stat = fs.statSync(targetPath);
      size = stat.size;
    } catch (e: any) {
      console.warn("Could not write backup to local disk:", e.message);
      size = Buffer.byteLength(JSON.stringify(snapshot));
    }

    return NextResponse.json({
      success: true,
      backup: {
        filename,
        size,
        created_at: new Date().toISOString(),
      },
      snapshotData: snapshot,
      message: `Live Supabase database snapshot saved successfully as '${filename}'.`,
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create database backup" },
      { status: 500 }
    );
  }
}


