# ProvisionSmart — Smart Inventory Management System (Wholesale Provisions)

**ProvisionSmart** is a modern, high-performance, and responsive web application designed specifically for wholesale provision, grocery, and general goods stores. Built for both desktop command centers and shopfloor tablets.

---

## 🌟 Key Features

### 1. Dual-Role Authentication & Access Control (RBAC)
- **Store Administrator** (`admin@provision.store` / `admin123`): Full access to cost prices, profit margins, inventory financial valuation in ₹, staff account management, soft-delete, recycle bin restoration, and database snapshots.
- **Inventory Manager** (`manager@provision.store` / `manager123`): Operational access for stock counting, quick Stock-In / Stock-Out, bulk uploads, and catalog searching. *Sensitive financial figures (cost price, margins) and deletion privileges are securely masked and blocked at the backend.*
- **Security**: Password hashing with `bcrypt`, JWT cookies (`jose`), 15-minute brute-force lockout after 5 failed attempts, and 30-minute inactivity auto-logout.

### 2. Live Analytics Dashboard (All in ₹ INR)
- **Financial Valuation**: Total Cost Valuation (₹), Potential Sales Revenue (₹), and Projected Gross Margin (₹) for Admins.
- **Stock Health**: Real-time stock status ratios (*In Stock*, *Low Stock*, *Out of Stock*).
- **Department Breakdown**: Stock distribution chart by category.
- **Urgent Alerts**: Immediate notification for critical low stock and near-expiry goods.
- **Recent Movement Feed**: Live audit feed of recent inventory adjustments.

### 3. Bulk Upload Studio & Spreadsheet Grid
- **3-Step CSV/Excel Upload**: Download standardized CSV template $\rightarrow$ Upload $\rightarrow$ Live Validation Preview with inline cell correction $\rightarrow$ Batch Transactional Commit.
- **Interactive Spreadsheet Grid**: Excel-like on-screen editable table with *Add Row* and live markup calculator in ₹.
- **Single Product Modal**: Complete single-item creation with SKU auto-generation, bulk pack sizing, and markup calculation.

### 4. Advanced Catalog & Shopfloor Operations
- **Live Debounced Search**: Search across Product Name, SKU, and Barcode.
- **Multi-Facet Filters**: Filter by Category, Stock Status, Price Range (₹), Supplier, and Expiry Horizon (7, 30, 90 days).
- **Quick Stock-In / Stock-Out**: 1-click counter adjustment with preset audit reasons (*Restock*, *Sale*, *Damaged*, *Returned*).
- **Barcode / SKU Scanner**: Shopfloor barcode dialog with 1-click test simulation.

### 5. Formatted Reports & Export
- **Export to CSV**: Filter-aware CSV export with role-based column masking.
- **Export to PDF**: Beautifully styled PDF reports using `jspdf` and `jspdf-autotable` with store branding, timestamp, valuation metrics, and tabular layouts.

### 6. Reliability & Data Safety
- **Soft Delete & Recycle Bin**: Deleted items are moved to the safety bin (`deleted_at`); Admins can restore or permanently purge.
- **Database Backup Snapshots**: 1-click database snapshots created in `./data/backups/`.
- **Full Audit Logging**: Every addition, edit, stock adjustment, and deletion is recorded with user identity and timestamp.
- **Dark Mode**: Persistent light/dark mode switch.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **Database**: SQLite (`better-sqlite3`) with WAL mode & busy timeout handling
- **Authentication**: JWT (`jose`) & `bcryptjs`
- **Data Export & Parsing**: `papaparse` (CSV), `jspdf` & `jspdf-autotable` (PDF)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

---

## 🔐 Default Demo Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@provision.store` | `admin123` |
| **Manager** | `manager@provision.store` | `manager123` |

*Use the quick role switcher on the navigation bar to toggle between roles instantly.*
