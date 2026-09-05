import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

// Ensure data, backup, and uploads directories exist
const dataDir = path.join(process.cwd(), "data");
const backupDir = path.join(dataDir, "backups");
const uploadsDir = path.join(dataDir, "uploads");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, "inventory.db");

// Use global singleton pattern
const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
  initialized: boolean | undefined;
};

export const db =
  globalForDb.db ||
  new Database(dbPath, {
    timeout: 10000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

// Enable WAL mode & foreign keys safely
try {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 10000");
} catch (e) {
  // Ignore if already enabled
}

// Initialize Schema & Run Migrations
function initSchema() {
  try {
    // 1. Users Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'manager')),
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );
    `);

    // 2. Products Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        sub_category TEXT,
        unit TEXT NOT NULL,
        bulk_pack_size INTEGER NOT NULL DEFAULT 1,
        cost_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 10,
        supplier TEXT,
        expiry_date TEXT,
        barcode TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Ensure columns exist on products
    const productColumns = db.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
    const colNames = new Set(productColumns.map((c) => c.name));

    if (!colNames.has("deleted_at")) {
      try {
        db.exec("ALTER TABLE products ADD COLUMN deleted_at TEXT;");
      } catch (e) {}
    }
    if (!colNames.has("barcode")) {
      try {
        db.exec("ALTER TABLE products ADD COLUMN barcode TEXT;");
      } catch (e) {}
    }

    // Product Indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at);
    `);

    // 3. Stock Logs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_logs (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        change_type TEXT NOT NULL,
        quantity_delta INTEGER NOT NULL,
        previous_quantity INTEGER NOT NULL,
        new_quantity INTEGER NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON stock_logs(created_at);
    `);

    // 4. Password Resets Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
      );
    `);

    // 5. Login Attempts Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        ip_or_email TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 1,
        last_attempt TEXT NOT NULL,
        locked_until TEXT
      );
    `);

    // 6. Upload History Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS upload_history (
        id TEXT PRIMARY KEY,
        original_filename TEXT NOT NULL,
        stored_filename TEXT,
        file_size INTEGER,
        total_rows INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        failed_count INTEGER NOT NULL,
        uploaded_by_id TEXT NOT NULL,
        uploaded_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_upload_history_created ON upload_history(created_at);
    `);

    // 7. Customers / Khata Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        store_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        credit_limit REAL NOT NULL DEFAULT 50000,
        current_balance REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    `);

    // 8. Invoices & Billing Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        subtotal REAL NOT NULL,
        discount_amount REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        grand_total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        payment_status TEXT NOT NULL,
        notes TEXT,
        created_by_id TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        sku TEXT NOT NULL,
        unit TEXT NOT NULL,
        unit_price REAL NOT NULL,
        cost_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        total_price REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);
    `);

    // 9. Khata Transactions Ledger Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS khata_transactions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        invoice_id TEXT,
        type TEXT NOT NULL CHECK(type IN ('debit_purchase', 'credit_payment')),
        amount REAL NOT NULL,
        previous_balance REAL NOT NULL,
        new_balance REAL NOT NULL,
        payment_mode TEXT,
        notes TEXT,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_khata_tx_cust ON khata_transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_khata_tx_created ON khata_transactions(created_at);
    `);

    // 10. Purchase Orders (Procurement) Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT UNIQUE NOT NULL,
        supplier_name TEXT NOT NULL,
        total_estimated_amount REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('draft', 'sent', 'received', 'cancelled')),
        items_count INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_by_id TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        received_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_po_created ON purchase_orders(created_at);

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id TEXT PRIMARY KEY,
        po_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        sku TEXT NOT NULL,
        current_stock INTEGER NOT NULL,
        reorder_quantity INTEGER NOT NULL,
        estimated_unit_cost REAL NOT NULL,
        total_estimated_cost REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);
    `);

    seedData();
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

function seedData() {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  
  if (userCount && userCount.count === 0) {
    const adminPasswordHash = bcrypt.hashSync("admin123", 10);
    const managerPasswordHash = bcrypt.hashSync("manager123", 10);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run("usr_admin_1", "Store Administrator", "admin@provision.store", adminPasswordHash, "admin", "active", now);
    insertUser.run("usr_manager_1", "Shopfloor Manager", "manager@provision.store", managerPasswordHash, "manager", "active", now);
  }

  const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
  if (productCount && productCount.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, sku, name, category, sub_category, unit, bulk_pack_size,
        cost_price, selling_price, stock_quantity, reorder_level,
        supplier, expiry_date, barcode, deleted_at, created_at, updated_at
      ) VALUES (
        @id, @sku, @name, @category, @sub_category, @unit, @bulk_pack_size,
        @cost_price, @selling_price, @stock_quantity, @reorder_level,
        @supplier, @expiry_date, @barcode, @deleted_at, @created_at, @updated_at
      )
    `);

    const insertLog = db.prepare(`
      INSERT INTO stock_logs (
        id, product_id, product_name, user_id, user_name,
        change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleProducts = [
      {
        id: "prod_001",
        sku: "GRN-BAS-25KG",
        barcode: "8901030384711",
        name: "Royal Supreme Basmati Rice (25kg Bag)",
        category: "Grains & Cereals",
        sub_category: "Rice",
        unit: "Bag",
        bulk_pack_size: 1,
        cost_price: 1650,
        selling_price: 2100,
        stock_quantity: 120,
        reorder_level: 25,
        supplier: "Golden Harvest Millers",
        expiry_date: "2027-04-15",
        deleted_at: null,
      },
      {
        id: "prod_002",
        sku: "GRN-SBR-50KG",
        barcode: "8901030384712",
        name: "Sona Masoori Raw Rice (50kg Sack)",
        category: "Grains & Cereals",
        sub_category: "Rice",
        unit: "Sack",
        bulk_pack_size: 1,
        cost_price: 2200,
        selling_price: 2750,
        stock_quantity: 85,
        reorder_level: 20,
        supplier: "Golden Harvest Millers",
        expiry_date: "2027-02-10",
        deleted_at: null,
      },
      {
        id: "prod_003",
        sku: "GRN-WHT-10KG",
        barcode: "8901030384713",
        name: "Whole Wheat Flour / Atta (10kg Pack)",
        category: "Grains & Cereals",
        sub_category: "Flour",
        unit: "Packet",
        bulk_pack_size: 5,
        cost_price: 360,
        selling_price: 440,
        stock_quantity: 140,
        reorder_level: 30,
        supplier: "Agro Flour Mills",
        expiry_date: "2026-11-20",
        deleted_at: null,
      },
      {
        id: "prod_004",
        sku: "PUL-TUR-25KG",
        barcode: "8901030384714",
        name: "Premium Toor Dal / Pigeon Pea (25kg Sack)",
        category: "Pulses & Lentils",
        sub_category: "Dal",
        unit: "Sack",
        bulk_pack_size: 1,
        cost_price: 3200,
        selling_price: 3950,
        stock_quantity: 18,
        reorder_level: 25,
        supplier: "Pinnacle Agro Trades",
        expiry_date: "2027-01-30",
        deleted_at: null,
      },
      {
        id: "prod_005",
        sku: "PUL-MSR-25KG",
        barcode: "8901030384715",
        name: "Red Masoor Dal (25kg Sack)",
        category: "Pulses & Lentils",
        sub_category: "Dal",
        unit: "Sack",
        bulk_pack_size: 1,
        cost_price: 2100,
        selling_price: 2600,
        stock_quantity: 52,
        reorder_level: 15,
        supplier: "Pinnacle Agro Trades",
        expiry_date: "2026-12-15",
        deleted_at: null,
      },
      {
        id: "prod_006",
        sku: "PUL-CHK-25KG",
        barcode: "8901030384716",
        name: "Kabuli Chickpeas / Chana (25kg Bag)",
        category: "Pulses & Lentils",
        sub_category: "Beans",
        unit: "Bag",
        bulk_pack_size: 1,
        cost_price: 2800,
        selling_price: 3400,
        stock_quantity: 0,
        reorder_level: 15,
        supplier: "Pinnacle Agro Trades",
        expiry_date: "2027-03-01",
        deleted_at: null,
      },
      {
        id: "prod_007",
        sku: "OIL-SUN-15L",
        barcode: "8901030384717",
        name: "Refined Sunflower Oil (15L Tin)",
        category: "Edible Oils & Ghee",
        sub_category: "Cooking Oil",
        unit: "Tin",
        bulk_pack_size: 1,
        cost_price: 1750,
        selling_price: 2100,
        stock_quantity: 160,
        reorder_level: 30,
        supplier: "Sunrich Edible Oils Ltd",
        expiry_date: "2026-10-18",
        deleted_at: null,
      },
      {
        id: "prod_008",
        sku: "OIL-MST-15L",
        barcode: "8901030384718",
        name: "Kachi Ghani Mustard Oil (15L Tin)",
        category: "Edible Oils & Ghee",
        sub_category: "Cooking Oil",
        unit: "Tin",
        bulk_pack_size: 1,
        cost_price: 1950,
        selling_price: 2350,
        stock_quantity: 40,
        reorder_level: 20,
        supplier: "Sunrich Edible Oils Ltd",
        expiry_date: "2026-12-05",
        deleted_at: null,
      },
      {
        id: "prod_009",
        sku: "OIL-GHE-1L",
        barcode: "8901030384719",
        name: "Pure Cow Ghee (1L Tin - Carton of 12)",
        category: "Edible Oils & Ghee",
        sub_category: "Ghee",
        unit: "Carton",
        bulk_pack_size: 12,
        cost_price: 5800,
        selling_price: 7200,
        stock_quantity: 8,
        reorder_level: 15,
        supplier: "Dairy Pure Foods",
        expiry_date: "2026-09-25",
        deleted_at: null,
      },
      {
        id: "prod_010",
        sku: "OIL-PLM-15L",
        barcode: "8901030384720",
        name: "Refined Palm Olein Oil (15L Tin)",
        category: "Edible Oils & Ghee",
        sub_category: "Commercial Oil",
        unit: "Tin",
        bulk_pack_size: 1,
        cost_price: 1400,
        selling_price: 1680,
        stock_quantity: 95,
        reorder_level: 20,
        supplier: "Sunrich Edible Oils Ltd",
        expiry_date: "2027-01-10",
        deleted_at: null,
      },
      {
        id: "prod_011",
        sku: "SPC-TRM-1KG",
        barcode: "8901030384721",
        name: "Pure Ground Turmeric Powder (1kg x 20 Pack Carton)",
        category: "Spices & Seasoning",
        sub_category: "Ground Spices",
        unit: "Carton",
        bulk_pack_size: 20,
        cost_price: 2400,
        selling_price: 3200,
        stock_quantity: 45,
        reorder_level: 10,
        supplier: "SpiceCraft Wholesalers",
        expiry_date: "2027-05-20",
        deleted_at: null,
      },
      {
        id: "prod_012",
        sku: "SPC-CHI-1KG",
        barcode: "8901030384722",
        name: "Kashmiri Red Chilli Powder (1kg x 20 Pack Carton)",
        category: "Spices & Seasoning",
        sub_category: "Ground Spices",
        unit: "Carton",
        bulk_pack_size: 20,
        cost_price: 3100,
        selling_price: 4200,
        stock_quantity: 6,
        reorder_level: 12,
        supplier: "SpiceCraft Wholesalers",
        expiry_date: "2027-06-15",
        deleted_at: null,
      },
      {
        id: "prod_013",
        sku: "SPC-CUM-10KG",
        barcode: "8901030384723",
        name: "Whole Cumin Seeds / Jeera (10kg Bag)",
        category: "Spices & Seasoning",
        sub_category: "Whole Spices",
        unit: "Bag",
        bulk_pack_size: 1,
        cost_price: 3800,
        selling_price: 4800,
        stock_quantity: 24,
        reorder_level: 8,
        supplier: "SpiceCraft Wholesalers",
        expiry_date: "2027-08-30",
        deleted_at: null,
      },
      {
        id: "prod_014",
        sku: "SPC-SLT-1KG",
        barcode: "8901030384724",
        name: "Iodized Table Salt (1kg x 25 Pack Carton)",
        category: "Spices & Seasoning",
        sub_category: "Salt",
        unit: "Carton",
        bulk_pack_size: 25,
        cost_price: 250,
        selling_price: 340,
        stock_quantity: 210,
        reorder_level: 40,
        supplier: "Ocean Salts Corp",
        expiry_date: "2028-01-01",
        deleted_at: null,
      },
      {
        id: "prod_015",
        sku: "SUG-WHT-50KG",
        barcode: "8901030384725",
        name: "Refined White Granulated Sugar (50kg Sack)",
        category: "Grains & Cereals",
        sub_category: "Sugar",
        unit: "Sack",
        bulk_pack_size: 1,
        cost_price: 1850,
        selling_price: 2150,
        stock_quantity: 110,
        reorder_level: 30,
        supplier: "Sugar Valley Mill",
        expiry_date: "2027-12-31",
        deleted_at: null,
      },
      {
        id: "prod_016",
        sku: "BEV-TEA-5KG",
        barcode: "8901030384726",
        name: "Assam CTC Premium Black Tea (5kg Master Bag)",
        category: "Beverages & Tea",
        sub_category: "Tea",
        unit: "Bag",
        bulk_pack_size: 1,
        cost_price: 1450,
        selling_price: 1850,
        stock_quantity: 62,
        reorder_level: 15,
        supplier: "Highland Tea Co.",
        expiry_date: "2027-03-20",
        deleted_at: null,
      },
      {
        id: "prod_017",
        sku: "BEV-COF-500G",
        barcode: "8901030384727",
        name: "Instant Roasted Coffee Jar (500g x 12 Carton)",
        category: "Beverages & Tea",
        sub_category: "Coffee",
        unit: "Carton",
        bulk_pack_size: 12,
        cost_price: 6500,
        selling_price: 8200,
        stock_quantity: 19,
        reorder_level: 10,
        supplier: "Highland Tea Co.",
        expiry_date: "2026-10-05",
        deleted_at: null,
      },
      {
        id: "prod_018",
        sku: "BEV-CON-750ML",
        barcode: "8901030384728",
        name: "Rose Flavor Milk Syrup Concentrate (750ml x 12 Case)",
        category: "Beverages & Tea",
        sub_category: "Syrups",
        unit: "Case",
        bulk_pack_size: 12,
        cost_price: 1200,
        selling_price: 1550,
        stock_quantity: 0,
        reorder_level: 8,
        supplier: "Highland Tea Co.",
        expiry_date: "2026-11-15",
        deleted_at: null,
      },
      {
        id: "prod_019",
        sku: "SNK-BSK-BOX",
        barcode: "8901030384729",
        name: "Glucose Energy Biscuits (100g x 72 Master Carton)",
        category: "Snacks & Packaged Goods",
        sub_category: "Biscuits",
        unit: "Carton",
        bulk_pack_size: 72,
        cost_price: 950,
        selling_price: 1200,
        stock_quantity: 130,
        reorder_level: 25,
        supplier: "Metro FMCG Distributors",
        expiry_date: "2026-12-10",
        deleted_at: null,
      },
      {
        id: "prod_020",
        sku: "SNK-NDL-BOX",
        barcode: "8901030384730",
        name: "Instant Masala Noodles (70g x 96 Master Carton)",
        category: "Snacks & Packaged Goods",
        sub_category: "Instant Noodles",
        unit: "Carton",
        bulk_pack_size: 96,
        cost_price: 880,
        selling_price: 1120,
        stock_quantity: 90,
        reorder_level: 20,
        supplier: "Metro FMCG Distributors",
        expiry_date: "2027-01-25",
        deleted_at: null,
      },
      {
        id: "prod_021",
        sku: "SNK-TOM-1KG",
        barcode: "8901030384731",
        name: "Commercial Tomato Ketchup Pouch (1kg x 12 Carton)",
        category: "Snacks & Packaged Goods",
        sub_category: "Sauces",
        unit: "Carton",
        bulk_pack_size: 12,
        cost_price: 720,
        selling_price: 950,
        stock_quantity: 34,
        reorder_level: 10,
        supplier: "Metro FMCG Distributors",
        expiry_date: "2026-09-18",
        deleted_at: null,
      },
      {
        id: "prod_022",
        sku: "CLN-DET-10KG",
        barcode: "8901030384732",
        name: "Commercial Grade Laundry Detergent (10kg Bag)",
        category: "Cleaning & Household",
        sub_category: "Laundry",
        unit: "Bag",
        bulk_pack_size: 1,
        cost_price: 780,
        selling_price: 980,
        stock_quantity: 75,
        reorder_level: 20,
        supplier: "Apex Hygiene Solutions",
        expiry_date: "2028-05-01",
        deleted_at: null,
      },
      {
        id: "prod_023",
        sku: "CLN-DSH-5L",
        barcode: "8901030384733",
        name: "Concentrated Dishwashing Gel (5L Can x 4 Case)",
        category: "Cleaning & Household",
        sub_category: "Kitchen Cleaning",
        unit: "Case",
        bulk_pack_size: 4,
        cost_price: 640,
        selling_price: 850,
        stock_quantity: 5,
        reorder_level: 15,
        supplier: "Apex Hygiene Solutions",
        expiry_date: "2028-01-01",
        deleted_at: null,
      },
      {
        id: "prod_024",
        sku: "CLN-FLR-5L",
        barcode: "8901030384734",
        name: "Pine Citrus Floor Cleaner Disinfectant (5L Can x 4 Case)",
        category: "Cleaning & Household",
        sub_category: "Floor Care",
        unit: "Case",
        bulk_pack_size: 4,
        cost_price: 580,
        selling_price: 760,
        stock_quantity: 48,
        reorder_level: 12,
        supplier: "Apex Hygiene Solutions",
        expiry_date: "2028-06-01",
        deleted_at: null,
      },
      {
        id: "prod_025",
        sku: "CLN-BLC-5L",
        barcode: "8901030384735",
        name: "Industrial Bleaching & Sanitizing Liquid (5L Can)",
        category: "Cleaning & Household",
        sub_category: "Sanitizer",
        unit: "Can",
        bulk_pack_size: 1,
        cost_price: 240,
        selling_price: 340,
        stock_quantity: 60,
        reorder_level: 15,
        supplier: "Apex Hygiene Solutions",
        expiry_date: "2027-09-01",
        deleted_at: null,
      },
      {
        id: "prod_026",
        sku: "PRS-SOP-BOX",
        barcode: "8901030384736",
        name: "Antibacterial Bathing Bar (125g x 72 Master Carton)",
        category: "Personal Care & Toiletries",
        sub_category: "Soaps",
        unit: "Carton",
        bulk_pack_size: 72,
        cost_price: 1450,
        selling_price: 1850,
        stock_quantity: 55,
        reorder_level: 15,
        supplier: "Supreme Care Wholesalers",
        expiry_date: "2027-11-20",
        deleted_at: null,
      },
      {
        id: "prod_027",
        sku: "PRS-TP-BOX",
        barcode: "8901030384737",
        name: "Fresh Mint Fluoride Toothpaste (150g x 48 Carton)",
        category: "Personal Care & Toiletries",
        sub_category: "Dental Care",
        unit: "Carton",
        bulk_pack_size: 48,
        cost_price: 1200,
        selling_price: 1550,
        stock_quantity: 38,
        reorder_level: 12,
        supplier: "Supreme Care Wholesalers",
        expiry_date: "2027-04-10",
        deleted_at: null,
      },
      {
        id: "prod_028",
        sku: "PRS-SHP-5L",
        barcode: "8901030384738",
        name: "Salon Herbal Hair Shampoo (5L Can x 2 Case)",
        category: "Personal Care & Toiletries",
        sub_category: "Hair Care",
        unit: "Case",
        bulk_pack_size: 2,
        cost_price: 950,
        selling_price: 1250,
        stock_quantity: 22,
        reorder_level: 10,
        supplier: "Supreme Care Wholesalers",
        expiry_date: "2027-08-15",
        deleted_at: null,
      }
    ];

    const transaction = db.transaction(() => {
      const now = new Date().toISOString();
      for (const p of sampleProducts) {
        insertProduct.run({
          ...p,
          created_at: now,
          updated_at: now,
        });

        insertLog.run(
          "log_" + Math.random().toString(36).substring(2, 9),
          p.id,
          p.name,
          "usr_admin_1",
          "Store Administrator",
          "stock_in",
          p.stock_quantity,
          0,
          p.stock_quantity,
          "Initial warehouse setup count",
          now
        );
      }
    });

    transaction();
  }

  // Seed sample retail store customers for Khata
  const custCount = db.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number };
  if (custCount && custCount.count === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, name, store_name, phone, address, credit_limit, current_balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    insertCustomer.run("cust_1", "Ramesh Patel", "Patel General Stores", "+91 98250 12345", "Shop 4, Market Yard, Sector 21", 100000, 14200, now, now);
    insertCustomer.run("cust_2", "Suresh Gupta", "Gupta Provision Mart", "+91 98980 67890", "12 Gandhi Road, Near Station", 75000, 0, now, now);
    insertCustomer.run("cust_3", "Mohan Lal", "Shree Krishna Kirana", "+91 94260 54321", "Plot 88, APMC Market Gate 2", 150000, 48500, now, now);
    insertCustomer.run("cust_4", "Dinesh Shah", "Shah Supermarket", "+91 97120 99887", "Cross Roads, Main Bazaar", 120000, 8900, now, now);
  }
}

export function createDatabaseBackup(): { success: boolean; filename: string; filePath: string; size: number } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `inventory_backup_${timestamp}.db`;
  const backupFilePath = path.join(backupDir, filename);

  try {
    db.backup(backupFilePath);
    const stat = fs.statSync(backupFilePath);
    return {
      success: true,
      filename,
      filePath: backupFilePath,
      size: stat.size,
    };
  } catch (err: any) {
    throw new Error(`Backup failed: ${err.message}`);
  }
}

// Initialize schema on import
initSchema();
