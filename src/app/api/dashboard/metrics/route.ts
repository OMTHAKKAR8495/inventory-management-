import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DashboardMetrics, Product, StockStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = user.role === "admin";
    const products = db.prepare("SELECT * FROM products WHERE deleted_at IS NULL").all() as Product[];
    const trashRecord = db.prepare("SELECT COUNT(*) as count FROM products WHERE deleted_at IS NOT NULL").get() as { count: number };
    const trashCount = trashRecord?.count || 0;

    let totalProducts = products.length;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;
    let expiringSoonCount = 0;

    let totalCostVal = 0;
    let totalSalesVal = 0;

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const in30DaysStr = in30Days.toISOString().split("T")[0];

    const categoryMap: Record<
      string,
      { count: number; units: number; costVal: number; salesVal: number }
    > = {};

    const criticalAlerts: any[] = [];

    for (const p of products) {
      totalStockUnits += p.stock_quantity;
      const costAmount = p.cost_price * p.stock_quantity;
      const salesAmount = p.selling_price * p.stock_quantity;
      totalCostVal += costAmount;
      totalSalesVal += salesAmount;

      let status: StockStatus = "in_stock";
      if (p.stock_quantity <= 0) {
        status = "out_of_stock";
        outOfStockCount++;
        criticalAlerts.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          stock_quantity: p.stock_quantity,
          reorder_level: p.reorder_level,
          status,
          expiry_date: p.expiry_date,
        });
      } else if (p.stock_quantity <= p.reorder_level) {
        status = "low_stock";
        lowStockCount++;
        criticalAlerts.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          stock_quantity: p.stock_quantity,
          reorder_level: p.reorder_level,
          status,
          expiry_date: p.expiry_date,
        });
      } else {
        inStockCount++;
      }

      if (p.expiry_date && p.expiry_date >= todayStr && p.expiry_date <= in30DaysStr) {
        expiringSoonCount++;
        if (!criticalAlerts.some((a) => a.id === p.id)) {
          criticalAlerts.push({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            stock_quantity: p.stock_quantity,
            reorder_level: p.reorder_level,
            status,
            expiry_date: p.expiry_date,
          });
        }
      }

      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { count: 0, units: 0, costVal: 0, salesVal: 0 };
      }
      categoryMap[p.category].count += 1;
      categoryMap[p.category].units += p.stock_quantity;
      categoryMap[p.category].costVal += costAmount;
      categoryMap[p.category].salesVal += salesAmount;
    }

    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      product_count: data.count,
      total_units: data.units,
      cost_value: isAdmin ? Number(data.costVal.toFixed(2)) : undefined,
      sales_value: Number(data.salesVal.toFixed(2)),
    }));

    const recentActivities = db
      .prepare("SELECT * FROM stock_logs ORDER BY created_at DESC LIMIT 10")
      .all() as any[];

    const totalPotentialProfit = totalSalesVal - totalCostVal;
    const avgMarginPct = totalCostVal > 0 ? (totalPotentialProfit / totalCostVal) * 100 : 0;

    const metrics: DashboardMetrics = {
      total_products: totalProducts,
      total_stock_units: totalStockUnits,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      in_stock_count: inStockCount,
      expiring_soon_count: expiringSoonCount,
      trash_count: trashCount,
      total_cost_value: isAdmin ? Number(totalCostVal.toFixed(2)) : undefined,
      total_sales_value: isAdmin ? Number(totalSalesVal.toFixed(2)) : undefined,
      total_potential_profit: isAdmin ? Number(totalPotentialProfit.toFixed(2)) : undefined,
      average_margin_percent: isAdmin ? Number(avgMarginPct.toFixed(1)) : undefined,
      category_breakdown: categoryBreakdown,
      recent_activities: recentActivities,
      critical_alerts: criticalAlerts.slice(0, 8),
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json({ error: "Failed to load dashboard metrics" }, { status: 500 });
  }
}
