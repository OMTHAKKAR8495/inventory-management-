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

export function setLocalStockOverride(identifier: string, newStock: number, additionalKeys?: string[]) {
  if (typeof window === "undefined" || !identifier) return;
  try {
    const current = getLocalStockOverrides();
    const qty = Math.max(0, Math.floor(Number(newStock) || 0));
    current[identifier] = qty;
    
    if (additionalKeys && Array.isArray(additionalKeys)) {
      for (const k of additionalKeys) {
        if (k && typeof k === "string") {
          current[k] = qty;
          current[k.toLowerCase().trim()] = qty;
        }
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save stock override:", e);
  }
}

export function setBulkStockOverrides(items: Array<{ id?: string; sku?: string; name?: string; stock_quantity: number }>) {
  if (typeof window === "undefined" || !Array.isArray(items)) return;
  try {
    const current = getLocalStockOverrides();
    for (const item of items) {
      const qty = Math.max(0, Math.floor(Number(item.stock_quantity) || 0));
      if (item.id) current[item.id] = qty;
      if (item.sku) {
        current[item.sku] = qty;
        current[item.sku.toLowerCase().trim()] = qty;
      }
      if (item.name) {
        current[item.name.toLowerCase().trim()] = qty;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save bulk stock overrides:", e);
  }
}

export function clearLocalStockOverrides() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

export function applyStockOverrides(products: Product[]): Product[] {
  if (!products || products.length === 0) return [];
  const overrides = getLocalStockOverrides();
  if (Object.keys(overrides).length === 0) {
    return products.map((p) => {
      const stock = Math.max(0, Math.floor(Number(p.stock_quantity) || 0));
      let status: StockStatus = "in_stock";
      if (stock <= 0) status = "out_of_stock";
      else if (stock <= p.reorder_level) status = "low_stock";
      return {
        ...p,
        stock_quantity: stock,
        status,
        stock_sales_value: Number((p.selling_price * stock).toFixed(2)),
        stock_cost_value: p.cost_price ? Number((p.cost_price * stock).toFixed(2)) : undefined,
      };
    });
  }

  return products.map((p) => {
    let resolvedStock = Number(p.stock_quantity) || 0;
    
    // Check ID match
    if (p.id && typeof overrides[p.id] === "number") {
      resolvedStock = overrides[p.id];
    } else if (p.sku && typeof overrides[p.sku] === "number") {
      resolvedStock = overrides[p.sku];
    } else if (p.sku && typeof overrides[p.sku.toLowerCase().trim()] === "number") {
      resolvedStock = overrides[p.sku.toLowerCase().trim()];
    } else if (p.name && typeof overrides[p.name.toLowerCase().trim()] === "number") {
      resolvedStock = overrides[p.name.toLowerCase().trim()];
    }

    resolvedStock = Math.max(0, Math.floor(resolvedStock));

    let status: StockStatus = "in_stock";
    if (resolvedStock <= 0) {
      status = "out_of_stock";
    } else if (resolvedStock <= p.reorder_level) {
      status = "low_stock";
    }

    return {
      ...p,
      stock_quantity: resolvedStock,
      status,
      stock_sales_value: Number((p.selling_price * resolvedStock).toFixed(2)),
      stock_cost_value: p.cost_price ? Number((p.cost_price * resolvedStock).toFixed(2)) : undefined,
    };
  });
}
