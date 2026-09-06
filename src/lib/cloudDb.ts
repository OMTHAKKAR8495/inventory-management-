import { Pool } from "pg";
import path from "path";
import fs from "fs";

// Detect if Supabase / PostgreSQL is configured via DATABASE_URL
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:9558413347%40Om@db.jedhlmpafnwhjrnkaomb.supabase.co:5432/postgres";

const isPostgres = Boolean(databaseUrl && databaseUrl.startsWith("postgres"));

// Global singleton for connection pool
const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
  sqliteDb: any | undefined;
};

export const pool =
  globalForPg.pgPool ||
  (isPostgres
    ? new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
    : undefined);

if (process.env.NODE_ENV !== "production" && pool) {
  globalForPg.pgPool = pool;
}

// Fallback SQLite Database
const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "inventory.db");

function getSqlite(): any {
  if (!globalForPg.sqliteDb) {
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {}
    }
    const Database = require("better-sqlite3");
    globalForPg.sqliteDb = new Database(dbPath, { timeout: 10000 });
    try {
      globalForPg.sqliteDb.pragma("journal_mode = WAL");
      globalForPg.sqliteDb.pragma("foreign_keys = ON");
    } catch (e) {}
  }
  return globalForPg.sqliteDb;
}

// Helper: Convert SQLite '?' placeholders to PostgreSQL '$1, $2, $3'
export function convertPlaceholders(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}


// Helper: Normalize PostgreSQL numeric string values to JS Numbers
function normalizeRow(row: any): any {
  if (!row || typeof row !== "object") return row;
  const copy = { ...row };
  const numericFields = [
    "cost_price",
    "selling_price",
    "stock_quantity",
    "reorder_level",
    "bulk_pack_size",
    "subtotal",
    "discount_amount",
    "tax_amount",
    "grand_total",
    "unit_price",
    "total_price",
    "credit_limit",
    "current_balance",
    "amount",
    "previous_balance",
    "new_balance",
    "total_estimated_amount",
    "estimated_unit_cost",
    "total_estimated_cost",
    "quantity_delta",
    "previous_quantity",
    "new_quantity",
  ];

  for (const key of Object.keys(copy)) {
    if (numericFields.includes(key) && copy[key] !== null && copy[key] !== undefined) {
      copy[key] = Number(copy[key]);
    }
  }
  return copy;
}

/**
 * Execute a query that returns multiple rows
 */
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (pool) {
    const pgSql = convertPlaceholders(sql);
    const result = await pool.query(pgSql, params);
    return result.rows.map(normalizeRow) as T[];
  } else {
    const db = getSqlite();
    const rows = db.prepare(sql).all(...params);
    return rows.map(normalizeRow) as T[];
  }
}

/**
 * Execute a query that returns a single row
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  if (pool) {
    const pgSql = convertPlaceholders(sql);
    const result = await pool.query(pgSql, params);
    if (result.rows.length === 0) return null;
    return normalizeRow(result.rows[0]) as T;
  } else {
    const db = getSqlite();
    const row = db.prepare(sql).get(...params);
    if (!row) return null;
    return normalizeRow(row) as T;
  }
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement
 */
export async function execute(sql: string, params: any[] = []): Promise<any> {
  if (pool) {
    const pgSql = convertPlaceholders(sql);
    return await pool.query(pgSql, params);
  } else {
    const db = getSqlite();
    return db.prepare(sql).run(...params);
  }
}

/**
 * Run operations inside a Database Transaction
 */
export async function withTransaction<T>(
  callback: (tx: {
    queryAll: <R = any>(sql: string, params?: any[]) => Promise<R[]>;
    queryOne: <R = any>(sql: string, params?: any[]) => Promise<R | null>;
    execute: (sql: string, params?: any[]) => Promise<any>;
  }) => Promise<T>
): Promise<T> {
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tx = {
        queryAll: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
          const pgSql = convertPlaceholders(sql);
          const res = await client.query(pgSql, params);
          return res.rows.map(normalizeRow) as R[];
        },
        queryOne: async <R = any>(sql: string, params: any[] = []): Promise<R | null> => {
          const pgSql = convertPlaceholders(sql);
          const res = await client.query(pgSql, params);
          if (res.rows.length === 0) return null;
          return normalizeRow(res.rows[0]) as R;
        },
        execute: async (sql: string, params: any[] = []): Promise<any> => {
          const pgSql = convertPlaceholders(sql);
          return await client.query(pgSql, params);
        },
      };

      const result = await callback(tx);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } else {
    const db = getSqlite();
    const runTx = db.transaction(async () => {
      const tx = {
        queryAll: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
          return db.prepare(sql).all(...params).map(normalizeRow) as R[];
        },
        queryOne: async <R = any>(sql: string, params: any[] = []): Promise<R | null> => {
          const row = db.prepare(sql).get(...params);
          return row ? (normalizeRow(row) as R) : null;
        },
        execute: async (sql: string, params: any[] = []): Promise<any> => {
          return db.prepare(sql).run(...params);
        },
      };
      return await callback(tx);
    });
    return runTx();
  }
}
