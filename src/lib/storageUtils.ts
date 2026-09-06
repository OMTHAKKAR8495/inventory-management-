import { Product, StockStatus } from "./types";

const LEGACY_STORAGE_KEY = "provisionsmart_stock_overrides";

/**
 * Clean up any legacy local stock overrides from previous sessions
 * to ensure SQLite database is the 100% authoritative single source of truth.
 */
export function cleanupLegacyStockOverrides() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {}
  }
}

// Auto-run cleanup on client import
if (typeof window !== "undefined") {
  cleanupLegacyStockOverrides();
}

/**
 * Resolves derived status and values directly from database product entity.
 * No local overrides or artificial caching.
 */
export function computeProductMetrics(product: Product): Product {
  const stock = Math.max(0, Math.floor(Number(product.stock_quantity) || 0));
  let status: StockStatus = "in_stock";
  if (stock <= 0) {
    status = "out_of_stock";
  } else if (stock <= product.reorder_level) {
    status = "low_stock";
  }

  return {
    ...product,
    stock_quantity: stock,
    status,
    stock_sales_value: Number((product.selling_price * stock).toFixed(2)),
    stock_cost_value: product.cost_price ? Number((product.cost_price * stock).toFixed(2)) : undefined,
  };
}
