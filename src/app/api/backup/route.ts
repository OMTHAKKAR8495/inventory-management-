import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryAll } from "@/lib/cloudDb";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const backupDir = path.join(process.cwd(), "data", "backups");

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const downloadFilename = searchParams.get("download");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

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

    const files = fs
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

    return NextResponse.json({ backups: files });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to list backups" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-cloud-${timestamp}.json`;
    const targetPath = path.join(backupDir, filename);

    // Export snapshots of all core tables
    const [products, customers, invoices, invoiceItems, stockLogs, khata] = await Promise.all([
      queryAll("SELECT * FROM products"),
      queryAll("SELECT * FROM customers"),
      queryAll("SELECT * FROM invoices"),
      queryAll("SELECT * FROM invoice_items"),
      queryAll("SELECT * FROM stock_logs"),
      queryAll("SELECT * FROM khata_transactions"),
    ]);

    const snapshot = {
      exported_at: new Date().toISOString(),
      exported_by: user.name,
      stats: {
        products: products.length,
        customers: customers.length,
        invoices: invoices.length,
        invoice_items: invoiceItems.length,
        stock_logs: stockLogs.length,
        khata_transactions: khata.length,
      },
      data: {
        products,
        customers,
        invoices,
        invoice_items: invoiceItems,
        stock_logs: stockLogs,
        khata_transactions: khata,
      },
    };

    fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2), "utf8");
    const stat = fs.statSync(targetPath);

    return NextResponse.json({
      success: true,
      backup: {
        filename,
        size: stat.size,
        created_at: new Date().toISOString(),
      },
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

