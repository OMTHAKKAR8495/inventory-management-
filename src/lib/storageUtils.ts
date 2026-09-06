import { Product, StockStatus } from "./types";

const STORAGE_KEY = "provisionsmart_stock_overrides";

export function getLocalStockOverrides(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function setLocalStockOverride(productId: string, newStock: number) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalStockOverrides();
    current[productId] = Math.max(0, newStock);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save stock override:", e);
  }
}

export function clearLocalStockOverrides() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

export function applyStockOverrides(products: Product[]): Product[] {
  const overrides = getLocalStockOverrides();
  if (!products || products.length === 0 || Object.keys(overrides).length === 0) {
    return products || [];
  }

  return products.map((p) => {
    if (typeof overrides[p.id] === "number") {
      const stock = overrides[p.id];
      let status: StockStatus = "in_stock";
      if (stock <= 0) {
        status = "out_of_stock";
      } else if (stock <= p.reorder_level) {
        status = "low_stock";
      }

      return {
        ...p,
        stock_quantity: stock,
        status,
        stock_sales_value: Number((p.selling_price * stock).toFixed(2)),
        stock_cost_value: p.cost_price ? Number((p.cost_price * stock).toFixed(2)) : undefined,
      };
    }
    return p;
  });
}
