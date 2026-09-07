export type UserRole = "admin" | "manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  status: "active" | "inactive";
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  sub_category?: string;
  unit: string;
  bulk_pack_size: number;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  supplier?: string;
  expiry_date?: string | null;
  barcode?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  // Computed properties
  status?: StockStatus;
  profit_margin?: number; // (selling - cost)
  profit_margin_percent?: number; // ((selling - cost) / cost) * 100
  stock_cost_value?: number; // cost * stock_quantity
  stock_sales_value?: number; // selling * stock_quantity
}

export interface StockLog {
  id: string;
  product_id: string;
  product_name?: string;
  user_id: string;
  user_name: string;
  change_type: "stock_in" | "stock_out" | "bulk_import" | "manual_adjustment" | "product_created" | "product_edited" | "product_deleted" | "product_restored";
  quantity_delta: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  created_at: string;
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface UploadHistoryRecord {
  id: string;
  original_filename: string;
  stored_filename?: string;
  file_size?: number;
  total_rows: number;
  success_count: number;
  failed_count: number;
  uploaded_by_id: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface DashboardMetrics {
  total_products: number;
  total_stock_units: number;
  low_stock_count: number;
  out_of_stock_count: number;
  in_stock_count: number;
  expiring_soon_count: number;
  trash_count: number;
  passed_bills_count?: number;
  last_backup_at?: string | null;
  database_file_size_kb?: number;
  // Admin only metrics (in ₹):
  total_cost_value?: number;
  total_sales_value?: number;
  total_potential_profit?: number;
  average_margin_percent?: number;
  category_breakdown: {
    category: string;
    product_count: number;
    total_units: number;
    cost_value?: number;
    sales_value?: number;
  }[];
  recent_activities: StockLog[];
  critical_alerts: {
    id: string;
    sku: string;
    name: string;
    category: string;
    stock_quantity: number;
    reorder_level: number;
    status: StockStatus;
    expiry_date?: string | null;
  }[];
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: string; // all, in_stock, low_stock, out_of_stock
  min_price?: number;
  max_price?: number;
  supplier?: string;
  expiry?: string; // all, 7days, 30days, expired
  start_date?: string;
  end_date?: string;
  show_trash?: boolean;
  sort_by?: "name" | "stock_quantity" | "selling_price" | "cost_price" | "updated_at";
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// ----------------------------------------------------
// POS & Quick Billing Models
// ----------------------------------------------------
export type PaymentMethod = "cash" | "upi" | "khata" | "card" | "bank_transfer";
export type PaymentStatus = "paid" | "partial" | "unpaid";

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface SavedBill {
  id: string;
  billNumber: string;
  customer: Customer | null;
  customerName: string;
  customerPhone: string;
  cart: CartItem[];
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  subtotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  notes: string;
  savedAt: string;
}

// ----------------------------------------------------
// Procurement & Purchase Orders (PO)
// ----------------------------------------------------
export type POStatus = "draft" | "sent" | "received" | "cancelled";

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  reorder_quantity: number;
  estimated_unit_cost: number;
  total_estimated_cost: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  total_estimated_amount: number;
  status: POStatus;
  items_count: number;
  notes?: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  received_at?: string | null;
  items?: PurchaseOrderItem[];
}

// ----------------------------------------------------
// Customer Khata & Trade Credit Ledger
// ----------------------------------------------------
export interface Customer {
  id: string;
  name: string;
  store_name: string;
  phone: string;
  address?: string;
  credit_limit: number;
  current_balance: number; // positive means customer owes store
  created_at: string;
  updated_at: string;
}

export interface KhataTransaction {
  id: string;
  customer_id: string;
  invoice_id?: string | null;
  type: "debit_purchase" | "credit_payment";
  amount: number;
  previous_balance: number;
  new_balance: number;
  payment_mode?: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
}

// ----------------------------------------------------
// Shopfloor Dispatch & Admin-to-Manager Messages
// ----------------------------------------------------
export type TaskPriority = "urgent" | "normal" | "low";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskCategory = "stock_order" | "shelf_audit" | "customer_order" | "general_work";

export interface ShopfloorTask {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  related_product_id?: string | null;
  related_product_name?: string | null;
  from_user_id: string;
  from_user_name: string;
  to_role: UserRole | "all";
  status: TaskStatus;
  notes?: string | null;
  created_at: string;
  completed_at?: string | null;
  completed_by_name?: string | null;
}


