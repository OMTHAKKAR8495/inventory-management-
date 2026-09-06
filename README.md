# ProvisionSmart — Commercial Wholesale Provision & Inventory Management System

**ProvisionSmart** is a commercial-grade, full-stack inventory management, POS billing, procurement, and B2B trade credit system built specifically for wholesale provision, grocery, and FMCG distributor businesses.

---

## 📁 Project Architecture & Directory Layout

```
inventory-management-/
├── data/                               # 🗄️ Database & Storage Layer (Persistent SQLite)
│   ├── inventory.db                    # Primary SQLite relational database
│   ├── backups/                        # 💾 Dedicated snapshot backup storage (.db files)
│   │   ├── .gitkeep
│   │   └── inventory_backup_*.db       # Timestamped full-state DB snapshots
│   └── uploads/                        # 📥 Bulk CSV/Excel staging directory
│       └── .gitkeep
│
├── src/
│   ├── app/                            # 🚀 Next.js App Router (Frontend Pages & Backend APIs)
│   │   ├── api/                        # ⚙️ BACKEND API LAYER
│   │   │   ├── audit-logs/             # Movement logs & staff action histories
│   │   │   ├── auth/                   # Login, logout, session check, password reset
│   │   │   ├── backup/                 # Snapshot creation, listing & file downloads
│   │   │   ├── dashboard/metrics/      # Financial KPIs (INR ₹), stock ratios & alerts
│   │   │   ├── khata/                  # Customer credit directory & payment settlement
│   │   │   ├── pos/                    # Real-time counter checkout & invoice generation
│   │   │   ├── procurement/            # Low-stock scanner & supplier PO generator
│   │   │   ├── products/               # CRUD, multi-filters, stock adjust & bulk batching
│   │   │   ├── tasks/                  # Admin-to-Manager work order dispatching
│   │   │   └── users/                  # RBAC user account management
│   │   ├── globals.css                 # Clean professional theme styling
│   │   ├── layout.tsx                  # Root HTML metadata & font providers
│   │   └── page.tsx                    # Main multi-view application router
│   │
│   ├── components/                     # 🎨 FRONTEND UI LAYER (Responsive React Components)
│   │   ├── Navbar.tsx                  # Navigation tabs, role switcher & alerts
│   │   ├── DashboardView.tsx           # Recharts visual analytics & financial KPIs
│   │   ├── InventoryView.tsx           # Multi-filter catalog, PDF/CSV export & actions
│   │   ├── BillingCounterView.tsx      # Shopfloor Counter POS & Printable Tax Invoices
│   │   ├── PurchaseOrdersView.tsx      # Supplier PO generator & 1-click inward restock
│   │   ├── KhataLedgerView.tsx         # B2B Trade credit directory & WhatsApp reminders
│   │   ├── BulkUploadStudio.tsx        # 3-step CSV upload & manual spreadsheet table
│   │   ├── AuditLogsView.tsx           # Chronological stock log history & user activity
│   │   ├── ShopfloorTasksModal.tsx     # Admin-to-Manager dispatch & work orders modal
│   │   ├── ProductFormModal.tsx        # Single-product creation & edit dialog
│   │   ├── StockAdjustModal.tsx        # Inline stock-in/stock-out adjustment
│   │   ├── UsersModal.tsx              # Staff user account management (Admin only)
│   │   ├── RecycleBinModal.tsx         # Soft-deleted inventory recovery
│   │   ├── BackupModal.tsx             # Database snapshot studio & download links
│   │   ├── BarcodeScannerModal.tsx     # 2D/1D barcode scanner dialog
│   │   └── LoginView.tsx               # Secure role-based login portal
│   │
│   └── lib/                            # 🧰 CORE BUSINESS LOGIC & HELPERS
│       ├── auth.ts                     # JWT signing, cookie verification & role checks
│       ├── db.ts                       # SQLite schemas, indexes, migrations & seeds
│       ├── exportUtils.ts              # PDF and CSV generator with role column masking
│       └── types.ts                    # TypeScript models, DTOs & state interfaces
```

---

## 🌟 The 6 Core Enterprise Modules

1. **🏬 Smart Catalog & Multi-Filter Engine (`Catalog`)**:
   - Live debounced search across Name, SKU, and Barcode.
   - Filters for Category, Stock Status (In/Low/Out of Stock), Price Range (₹), Supplier, and Expiry date.
   - Export to CSV or formatted Printable PDF with store branding.
   - Soft-delete with Recycle Bin restoration.

2. **📊 Executive Stock Valuation & Visual Analytics (`Overview`)**:
   - Financial KPIs in Indian Rupees (₹): Total Stock Cost Valuation, Potential Sales Revenue, and Projected Margin (Admin only).
   - Recharts Stock Units Bar Chart and Category Asset Valuation Donut Chart.

3. **📥 Bulk Upload & Spreadsheet Studio (`Bulk Add`)**:
   - 3-Step CSV/Excel uploader with downloadable template and inline cell error correction.
   - Manual Spreadsheet Table Grid for fast row-by-row keyboard data entry.

4. **🛒 Shopfloor Counter POS & Live Billing (`Counter POS`)**:
   - Fast item scanner / product selector with stock ceiling validation.
   - Live discount, GST slab calculation (0%, 5%, 12%, 18%), and multi-payment modes (Cash, UPI, Khata, Card).
   - Atomic stock deduction and printable Tax Invoice modal (`window.print()`).

5. **🚚 Supplier Auto-Procurement & Purchase Orders (`Supplier POs`)**:
   - 1-Click scan of low-stock items auto-grouped by miller/supplier.
   - 1-Click "Receive & Stock" inward delivery button that restocks the live catalog.

6. **📖 Customer Khata & B2B Trade Credit Ledger (`Khata Ledger`)**:
   - Credit limit tracking and outstanding balance directory for retail store clients.
   - Chronological debit/credit transaction ledger.
   - 1-Click WhatsApp payment reminders with exact pending ₹ balance.

7. **📬 Admin-to-Manager Direct Work Orders & Messaging**:
   - Admin can dispatch priority-coded tasks and reorders directly to shopfloor staff.
   - Manager receives live badge alerts with 1-click status progression (`Pending` ➔ `In Progress` ➔ `Completed`).

---

## 🔐 Default Access Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Store Administrator** | `admin@provision.store` | `admin123` | Full access (Valuation in ₹, Users, POs, Backups, Recycle Bin) |
| **Shopfloor Manager** | `manager@provision.store` | `manager123` | Operational access (POS, Stock Adjustments, Khata, Bulk Upload) |

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
http://localhost:3000
```

