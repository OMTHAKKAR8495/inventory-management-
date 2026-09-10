import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "inventory.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("🌱 Starting ProvisionSmart Demo & Seed Data Generator...\n");

// Ensure tables exist before seeding
import "@/lib/db";

const now = new Date().toISOString();

// 1. Seed Users
console.log("👤 Seeding Staff & Admin Users...");
const insertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const users = [
  {
    id: "usr_admin_1",
    name: "Store Administrator",
    email: "admin@provision.store",
    password: "admin123",
    role: "admin",
  },
  {
    id: "usr_manager_1",
    name: "Shopfloor Manager",
    email: "manager@provision.store",
    password: "manager123",
    role: "manager",
  },
  {
    id: "usr_admin_legacy",
    name: "Asha Store Admin",
    email: "ashastore@gmail.com",
    password: "9558413347@Om",
    role: "admin",
  },
];

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run(u.id, u.name, u.email, hash, u.role, "active", now);
}
console.log(`✓ Seeded ${users.length} user accounts.`);

// 2. Seed Wholesale Products
console.log("📦 Seeding Wholesale Provision Products...");
const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products (
    id, sku, name, category, sub_category, unit, bulk_pack_size,
    cost_price, selling_price, stock_quantity, reorder_level,
    supplier, expiry_date, barcode, deleted_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?)
`);

const products = [
  {
    id: "prod_rice_25kg",
    sku: "GRN-RICE-01",
    name: "Basmati Long Grain Rice (25kg)",
    category: "Grains & Cereals",
    sub: "Rice",
    unit: "Bag",
    pack: 1,
    cost: 1650,
    price: 2100,
    qty: 65,
    reorder: 20,
    supplier: "Golden Harvest Rice Mills",
    expiry: "2027-06-30",
    barcode: "890103001001",
  },
  {
    id: "prod_kolam_25kg",
    sku: "GRN-RICE-02",
    name: "Wada Kolam Raw Rice (25kg)",
    category: "Grains & Cereals",
    sub: "Rice",
    unit: "Bag",
    pack: 1,
    cost: 1250,
    price: 1550,
    qty: 40,
    reorder: 15,
    supplier: "Shree Ganesh Agro Mills",
    expiry: "2027-04-15",
    barcode: "890103001002",
  },
  {
    id: "prod_atta_50kg",
    sku: "FLR-ATTA-01",
    name: "Sharbati MP Wheat Atta (50kg Bag)",
    category: "Flours & Sooji",
    sub: "Atta",
    unit: "Bag",
    pack: 1,
    cost: 1480,
    price: 1850,
    qty: 85,
    reorder: 25,
    supplier: "Narmada Flour Mills",
    expiry: "2026-11-30",
    barcode: "890103002001",
  },
  {
    id: "prod_toor_30kg",
    sku: "PLS-TOOR-01",
    name: "Fatka Toor Dal Premium (30kg)",
    category: "Pulses & Lentils",
    sub: "Toor Dal",
    unit: "Sack",
    pack: 1,
    cost: 3450,
    price: 4200,
    qty: 12, // Low stock
    reorder: 15,
    supplier: "Latur Pulse Mills",
    expiry: "2026-12-31",
    barcode: "890103003001",
  },
  {
    id: "prod_moong_30kg",
    sku: "PLS-MNG-01",
    name: "Desi Green Moong Dal (30kg)",
    category: "Pulses & Lentils",
    sub: "Moong Dal",
    unit: "Sack",
    pack: 1,
    cost: 2850,
    price: 3400,
    qty: 28,
    reorder: 10,
    supplier: "Rajasthan Agro Hub",
    expiry: "2027-01-20",
    barcode: "890103003002",
  },
  {
    id: "prod_chana_30kg",
    sku: "PLS-CHNA-01",
    name: "Chana Dal Polished (30kg)",
    category: "Pulses & Lentils",
    sub: "Chana Dal",
    unit: "Sack",
    pack: 1,
    cost: 2100,
    price: 2600,
    qty: 0, // Out of stock
    reorder: 10,
    supplier: "Indore Dal Millers",
    expiry: "2026-10-15",
    barcode: "890103003003",
  },
  {
    id: "prod_mustard_15l",
    sku: "OIL-MSTD-01",
    name: "Kachi Ghani Mustard Oil (15L Tin)",
    category: "Edible Oils & Ghee",
    sub: "Mustard Oil",
    unit: "Tin",
    pack: 1,
    cost: 1850,
    price: 2250,
    qty: 38,
    reorder: 15,
    supplier: "Fortune Agro Refineries",
    expiry: "2027-03-31",
    barcode: "890103004001",
  },
  {
    id: "prod_sunflower_15l",
    sku: "OIL-SNFL-01",
    name: "Refined Sunflower Cooking Oil (15L Tin)",
    category: "Edible Oils & Ghee",
    sub: "Sunflower Oil",
    unit: "Tin",
    pack: 1,
    cost: 1680,
    price: 2050,
    qty: 45,
    reorder: 20,
    supplier: "Gemini Edibles Ltd",
    expiry: "2027-02-28",
    barcode: "890103004002",
  },
  {
    id: "prod_ghee_15kg",
    sku: "OIL-GHEE-01",
    name: "Pure Cow Desi Ghee (15kg Tin)",
    category: "Edible Oils & Ghee",
    sub: "Ghee",
    unit: "Tin",
    pack: 1,
    cost: 7200,
    price: 8850,
    qty: 8, // Low stock
    reorder: 10,
    supplier: "Amul Dairy Federation",
    expiry: "2027-08-31",
    barcode: "890103004003",
  },
  {
    id: "prod_sugar_50kg",
    sku: "SGR-M30-01",
    name: "White Crystal Sugar M-30 (50kg Bag)",
    category: "Sugar & Sweeteners",
    sub: "Sugar",
    unit: "Bag",
    pack: 1,
    cost: 1950,
    price: 2350,
    qty: 120,
    reorder: 30,
    supplier: "Kolhapur Sugar Works",
    expiry: "2028-01-01",
    barcode: "890103005001",
  },
  {
    id: "prod_salt_carton",
    sku: "SPICE-SALT-01",
    name: "Iodized Table Salt (1kg x 25 Pkt Carton)",
    category: "Salt, Spices & Seasoning",
    sub: "Salt",
    unit: "Carton",
    pack: 25,
    cost: 450,
    price: 600,
    qty: 70,
    reorder: 20,
    supplier: "Tata Consumer Products",
    expiry: "2028-12-31",
    barcode: "890103006001",
  },
  {
    id: "prod_tea_10kg",
    sku: "BEV-TEA-01",
    name: "Assam CTC Dust Tea (10kg Commercial Bag)",
    category: "Beverages & Tea",
    sub: "Tea",
    unit: "Bag",
    pack: 1,
    cost: 2600,
    price: 3300,
    qty: 25,
    reorder: 8,
    supplier: "Guwahati Tea Auctions",
    expiry: "2027-05-15",
    barcode: "890103007001",
  },
];

for (const p of products) {
  insertProduct.run(
    p.id,
    p.sku,
    p.name,
    p.category,
    p.sub,
    p.unit,
    p.pack,
    p.cost,
    p.price,
    p.qty,
    p.reorder,
    p.supplier,
    p.expiry,
    p.barcode,
    now,
    now
  );
}
console.log(`✓ Seeded ${products.length} wholesale catalog items.`);

// 3. Seed Khata Customers & Credit Directory
console.log("📖 Seeding Retail Khata Accounts & Balances...");
const insertCustomer = db.prepare(`
  INSERT OR REPLACE INTO customers (id, name, store_name, phone, address, credit_limit, current_balance, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertKhataTx = db.prepare(`
  INSERT OR REPLACE INTO khata_transactions (
    id, customer_id, invoice_id, type, amount, previous_balance, new_balance,
    payment_mode, notes, created_by_name, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const customers = [
  {
    id: "cust_gupta",
    name: "Suresh Gupta",
    store: "Gupta Provision Mart",
    phone: "+91 98980 67890",
    address: "Shop 14, Main Bazaar, Sector 4",
    limit: 75000,
    balance: 68219.2,
  },
  {
    id: "cust_krishna",
    name: "Mohan Lal",
    store: "Shree Krishna Kirana",
    phone: "+91 94260 54321",
    address: "12 Gandhi Chowk, Station Road",
    limit: 150000,
    balance: 49950.0,
  },
  {
    id: "cust_jalaram",
    name: "Om Patel",
    store: "Shree Jalaram Store",
    phone: "+91 95584 13347",
    address: "B-21 APMC Retail Complex",
    limit: 50000,
    balance: 35320.0,
  },
  {
    id: "cust_patel",
    name: "Ramesh Patel",
    store: "Patel General Stores",
    phone: "+91 98250 12345",
    address: "Plot 88, Near Bus Stand",
    limit: 100000,
    balance: 14200.0,
  },
  {
    id: "cust_shah",
    name: "Dinesh Shah",
    store: "Shah Supermarket",
    phone: "+91 97120 99887",
    address: "Shop 1-2, City Center Mall",
    limit: 120000,
    balance: 0.0,
  },
];

for (const c of customers) {
  insertCustomer.run(c.id, c.name, c.store, c.phone, c.address, c.limit, c.balance, now, now);

  if (c.balance > 0) {
    insertKhataTx.run(
      `ktx_init_${c.id}`,
      c.id,
      null,
      "debit_purchase",
      c.balance,
      0,
      c.balance,
      "Khata Credit",
      "Consolidated B2B credit purchase",
      "Store Administrator",
      now
    );
  }
}
console.log(`✓ Seeded ${customers.length} Khata customer accounts with opening ledgers.`);

console.log("\n========================================================");
console.log("✅ Demo & Seed Data Loaded Successfully!");
console.log("========================================================");
console.log("Default Login Credentials:");
console.log("  • Admin:   admin@provision.store   / admin123");
console.log("  • Manager: manager@provision.store / manager123");
console.log("========================================================\n");
