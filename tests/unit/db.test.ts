import { describe, it, expect } from "vitest";
import { db, dataDir, backupDir, uploadsDir, createDatabaseBackup } from "@/lib/db";
import fs from "fs";

describe("Database Storage Layer (src/lib/db.ts)", () => {
  it("should ensure persistent directories exist", () => {
    expect(fs.existsSync(dataDir)).toBe(true);
    expect(fs.existsSync(backupDir)).toBe(true);
    expect(fs.existsSync(uploadsDir)).toBe(true);
  });

  it("should initialize all primary core tables in SQLite schema", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const tableNames = new Set(tables.map((t) => t.name));

    const expectedTables = [
      "users",
      "products",
      "stock_logs",
      "password_resets",
      "login_attempts",
      "upload_history",
      "customers",
      "invoices",
      "invoice_items",
      "khata_transactions",
      "purchase_orders",
      "purchase_order_items",
      "shopfloor_tasks",
    ];

    for (const expected of expectedTables) {
      expect(tableNames.has(expected)).toBe(true);
    }
  });

  it("should verify product table has essential enterprise columns", () => {
    const columns = db.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
    const colNames = new Set(columns.map((c) => c.name));

    expect(colNames.has("id")).toBe(true);
    expect(colNames.has("sku")).toBe(true);
    expect(colNames.has("name")).toBe(true);
    expect(colNames.has("category")).toBe(true);
    expect(colNames.has("cost_price")).toBe(true);
    expect(colNames.has("selling_price")).toBe(true);
    expect(colNames.has("stock_quantity")).toBe(true);
    expect(colNames.has("deleted_at")).toBe(true);
  });

  it("should generate a database snapshot backup file successfully", async () => {
    const backupResult = await createDatabaseBackup();

    expect(backupResult.success).toBe(true);
    expect(backupResult.filename).toMatch(/^inventory_backup_.*\.db$/);
    expect(fs.existsSync(backupResult.filePath)).toBe(true);
    expect(backupResult.size).toBeGreaterThan(0);

    // Clean up created test backup file
    try {
      fs.unlinkSync(backupResult.filePath);
    } catch (e) {}
  });
});
