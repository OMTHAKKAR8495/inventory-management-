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
