"use client";

import React from "react";
import {
  Package,
  Boxes,
  AlertTriangle,
  XCircle,
  TrendingUp,
  PieChart as PieIcon,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShoppingCart,
  Truck,
  BookOpen,
  BarChart3,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DashboardMetrics, User } from "@/lib/types";

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  user: User;
  onNavigateToInventory: (filterStatus?: string) => void;
  onNavigateToBulk: () => void;
  onNavigateToPOS?: () => void;
  onNavigateToPO?: () => void;
  onNavigateToKhata?: () => void;
  onQuickStockAdjust: (productId: string) => void;
  isLoading: boolean;
}

const PIE_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#14b8a6", "#06b6d4"];

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  user,
  onNavigateToInventory,
  onNavigateToBulk,
  onNavigateToPOS,
  onNavigateToPO,
  onNavigateToKhata,
  onQuickStockAdjust,
  isLoading,
}) => {
  const isAdmin = user.role === "admin";

  if (isLoading || !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-slate-200/70 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const inStockPct = metrics.total_products > 0
    ? Math.round((metrics.in_stock_count / metrics.total_products) * 100)
    : 0;
  const lowStockPct = metrics.total_products > 0
    ? Math.round((metrics.low_stock_count / metrics.total_products) * 100)
    : 0;
  const outOfStockPct = metrics.total_products > 0
    ? Math.round((metrics.out_of_stock_count / metrics.total_products) * 100)
    : 0;

  const chartData = metrics.category_breakdown.map((cat) => ({
    name: cat.category.split(" ")[0],
    fullName: cat.category,
    units: cat.total_units,
    value: cat.cost_value || (cat.sales_value ? cat.sales_value * 0.8 : 0),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Welcome Banner - Clean Professional Executive Header */}
      <div className="relative overflow-hidden bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-xs font-semibold text-blue-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Wholesale Stock Pulse
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Persistent Database: Online
              </div>
              {metrics?.last_backup_at && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/60 text-xs font-semibold text-purple-700">
                  <Clock className="w-3.5 h-3.5" />
                  Last Backup: {new Date(metrics.last_backup_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Good day, {user.name}
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              {isAdmin
                ? "Here is the real-time financial valuation, margin performance, and inventory health of the provision warehouse in Indian Rupees (₹)."
                : "Manage wholesale goods, track low stock items, perform instant stock-in/out, and batch add inventory."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToPOS && (
              <button
                onClick={onNavigateToPOS}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Quick Billing (POS)
              </button>
            )}

            {onNavigateToPO && (
              <button
                onClick={onNavigateToPO}
                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                Supplier POs
              </button>
            )}

            {onNavigateToKhata && (
              <button
                onClick={onNavigateToKhata}
                className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                Khata Ledger
              </button>
            )}
          </div>
        </div>

        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Stock & Inventory Vital Statistics
          </h3>
          <span className="text-xs text-slate-500">Auto-synchronized with shop floor</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Products */}
          <div
            onClick={() => onNavigateToInventory()}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Products</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.total_products.toLocaleString("en-IN")}
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <span className="font-semibold text-blue-600">Active SKUs</span> in catalog
            </div>
          </div>

          {/* Total Units */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Warehouse Units</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.total_stock_units.toLocaleString("en-IN")}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Bulk sacks, tins, cartons, & units
            </div>
          </div>

          {/* Low Stock Warning */}
          <div
            onClick={() => onNavigateToInventory("low_stock")}
            className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md transition cursor-pointer group bg-gradient-to-b from-amber-50/30 to-white"
          >
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Threshold</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900">
              {metrics.low_stock_count}
            </div>
            <div className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1">
              Needs reorder soon <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Out of Stock */}
          <div
            onClick={() => onNavigateToInventory("out_of_stock")}
            className="bg-white p-5 rounded-2xl border border-red-200/80 shadow-xs hover:shadow-md transition cursor-pointer group bg-gradient-to-b from-red-50/30 to-white"
          >
            <div className="flex items-center justify-between text-red-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center group-hover:scale-110 transition">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-900">
              {metrics.out_of_stock_count}
            </div>
            <div className="mt-2 text-xs text-red-700 font-medium flex items-center gap-1">
              0 inventory on hand <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Financial Metrics Section (Clean Professional White Card - Rupee Format) */}
      {isAdmin && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-purple-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold text-base flex items-center justify-center shadow-xs">
                ₹
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                  Financial Valuation & Profit Potential
                </h4>
                <p className="text-xs text-slate-500">Live valuation calculated in Indian Rupees (₹) based on wholesale cost and selling rates</p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
              Admin Confidential
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Stock Cost Value */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Stock Cost Value
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{metrics.total_cost_value?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Total invested in on-hand inventory</p>
            </div>

            {/* Total Potential Sales Value */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Total Potential Sales Value
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                ₹{metrics.total_sales_value?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-emerald-700/80 mt-1 font-medium">Expected gross revenue at current pricing</p>
            </div>

            {/* Projected Gross Profit */}
            <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200/80">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Projected Gross Margin
              </span>
              <div className="text-2xl font-black text-blue-700 mt-1 flex items-center gap-1.5">
                ₹{metrics.total_potential_profit?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-[11px] text-blue-700/80 mt-1 font-medium">Selling Value minus Cost Value</p>
            </div>

            {/* Average Margin % */}
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                Average Store Markup
              </span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                +{metrics.average_margin_percent}%
              </div>
              <p className="text-[11px] text-amber-800/80 mt-1 font-medium">Across all wholesale goods categories</p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Charts: Recharts Bar & Pie breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Bar Chart of Units */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Stock Volume by Department (Units)
            </h4>
            <span className="text-xs text-slate-400 font-medium">Live On-Hand Inventory</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  formatter={(value: any) => [`${value} units`, "Stock Count"]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Bar dataKey="units" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right (5 cols): Donut Chart of Valuation */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              Inventory Valuation Share (₹)
            </h4>
            <span className="text-xs text-slate-400 font-medium">Department Split</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="fullName"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Valuation"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stock Health Bar & Urgent Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Health Bar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock Health Status */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Overall Inventory Health Ratio
              </h4>
              <span className="text-xs text-slate-500">{metrics.total_products} items tracked</span>
            </div>

            {/* Progress Segment Bar */}
            <div className="w-full h-3.5 bg-slate-100 rounded-full flex overflow-hidden p-0.5 gap-0.5">
              <div
                style={{ width: `${inStockPct}%` }}
                className="bg-emerald-500 rounded-full transition-all duration-500"
                title={`In Stock: ${inStockPct}%`}
              />
              <div
                style={{ width: `${lowStockPct}%` }}
                className="bg-amber-400 rounded-full transition-all duration-500"
                title={`Low Stock: ${lowStockPct}%`}
              />
              <div
                style={{ width: `${outOfStockPct}%` }}
                className="bg-red-500 rounded-full transition-all duration-500"
                title={`Out of Stock: ${outOfStockPct}%`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700">Healthy ({metrics.in_stock_count} items - {inStockPct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-700">Low Stock ({metrics.low_stock_count} items - {lowStockPct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-700">Out of Stock ({metrics.out_of_stock_count} items - {outOfStockPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Urgent Attention */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Action Required ({metrics.critical_alerts.length})
              </h4>
              <button
                onClick={() => onNavigateToInventory("low_stock")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {metrics.critical_alerts.length > 0 ? (
                metrics.critical_alerts.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500">{item.category}</p>
                      {item.expiry_date && (
                        <p className="text-[10px] text-amber-600 font-medium">Exp: {item.expiry_date}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === "out_of_stock"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.stock_quantity <= 0 ? "OUT OF STOCK" : `${item.stock_quantity} left`}
                      </span>
                      <button
                        onClick={() => onQuickStockAdjust(item.id)}
                        className="block mt-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        + Restock
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  No critical stock warnings right now!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
