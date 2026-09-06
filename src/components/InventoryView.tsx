"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Download,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  PlusCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ScanBarcode,
  Package,
  MessageSquare,
} from "lucide-react";
import { Product, ProductFilters, User } from "@/lib/types";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

interface InventoryViewProps {
  user: User;
  onOpenAddModal: () => void;
  onOpenEditModal: (product: Product) => void;
  onOpenStockAdjustModal: (product: Product) => void;
  onOpenBulkUpload: () => void;
  onOpenBarcodeScanner?: () => void;
  onOpenRecycleBin?: () => void;
  onOpenTasksModal?: (productId?: string, productName?: string) => void;
  initialFilterStatus?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  user,
  onOpenAddModal,
  onOpenEditModal,
  onOpenStockAdjustModal,
  onOpenBulkUpload,
  onOpenBarcodeScanner,
  onOpenRecycleBin,
  onOpenTasksModal,
  initialFilterStatus,
}) => {
  const isAdmin = user.role === "admin";

  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState(initialFilterStatus || "all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedExpiry, setSelectedExpiry] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<string>("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Soft Delete Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Products
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedSupplier && selectedSupplier !== "all") params.set("supplier", selectedSupplier);
      if (selectedExpiry && selectedExpiry !== "all") params.set("expiry", selectedExpiry);
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load inventory");
      const data = await res.json();

      setProducts(data.products || []);
      setTotalCount(data.total || 0);
      if (data.categories) setCategories(data.categories);
      if (data.suppliers) setSuppliers(data.suppliers);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [
    debouncedSearch,
    selectedCategory,
    selectedStatus,
    selectedSupplier,
    selectedExpiry,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedSupplier("all");
    setSelectedExpiry("all");
    setMinPrice("");
    setMaxPrice("");
    setStartDate("");
    setEndDate("");
    setSortBy("updated_at");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch ||
    selectedCategory !== "all" ||
    selectedStatus !== "all" ||
    selectedSupplier !== "all" ||
    selectedExpiry !== "all" ||
    minPrice ||
    maxPrice ||
    startDate ||
    endDate;

  const handleExport = async (type: "csv" | "pdf") => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedSupplier && selectedSupplier !== "all") params.set("supplier", selectedSupplier);
      if (selectedExpiry && selectedExpiry !== "all") params.set("expiry", selectedExpiry);
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);
      params.set("all", "true");

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      const exportList: Product[] = data.products || [];

      if (type === "csv") {
        exportToCSV(exportList, user.role, `wholesale_stock_export_${new Date().toISOString().split("T")[0]}.csv`);
      } else {
        const filterDesc = hasActiveFilters ? "Filtered Stock Query" : "Entire Active Catalog";
        exportToPDF(exportList, user.role, "Wholesale Provision Store", filterDesc);
      }
    } catch (err) {
      alert("Failed to export items");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete product");
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Top Banner & Main Action Buttons */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Wholesale Inventory Catalog
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse, filter, adjust quantities, and manage {totalCount.toLocaleString("en-IN")} provision store items in Indian Rupees (₹).
          </p>
        </div>

        {/* Priority Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>

          <button
            onClick={onOpenBulkUpload}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Upload / Add
          </button>

          {onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              title="Barcode Scanner"
            >
              <ScanBarcode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Scan Barcode
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Export Buttons */}
          <button
            onClick={() => handleExport("csv")}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={() => handleExport("pdf")}
            className="px-3.5 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="Export Formatted PDF Report"
          >
            <FileText className="w-4 h-4" />
            PDF Report
          </button>
        </div>
      </div>

      {/* Filter and Search Controls Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Row 1: Search Bar & Primary Status Filters */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Live Search Input (Debounced) */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, barcode, or supplier (debounced)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden bg-slate-50/50 text-slate-900"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Stock Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Items" },
              { id: "in_stock", label: "In Stock" },
              { id: "low_stock", label: "Low Stock" },
              { id: "out_of_stock", label: "Out of Stock" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => {
                  setSelectedStatus(pill.id);
                  setPage(1);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedStatus === pill.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pill.label}
              </button>
            ))}

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                showAdvancedFilters || hasActiveFilters
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Advanced Collapsible Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in text-xs">
            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 outline-hidden focus:border-blue-500 font-medium"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Supplier</label>
              <select
                value={selectedSupplier}
                onChange={(e) => {
                  setSelectedSupplier(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 outline-hidden focus:border-blue-500 font-medium"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Expiry Horizon</label>
              <select
                value={selectedExpiry}
                onChange={(e) => {
                  setSelectedExpiry(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 outline-hidden focus:border-blue-500 font-medium"
              >
                <option value="all">Any Expiry Date</option>
                <option value="7days">Expiring within 7 Days</option>
                <option value="30days">Expiring within 30 Days</option>
                <option value="expired">Expired Goods</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Sort Catalog By</label>
              <div className="flex gap-1.5">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 outline-hidden focus:border-blue-500 font-medium"
                >
                  <option value="updated_at">Recently Updated</option>
                  <option value="name">Product Name (A-Z)</option>
                  <option value="stock_quantity">Stock Quantity</option>
                  <option value="selling_price">Selling Price (₹)</option>
                  {isAdmin && <option value="cost_price">Cost Price (₹)</option>}
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition"
                  title="Toggle Asc/Desc"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Price Range */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Selling Price Range (₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                  className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-hidden text-slate-900 bg-white font-mono"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                  className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-hidden text-slate-900 bg-white font-mono"
                />
              </div>
            </div>

            {/* Date Range Added */}
            <div className="sm:col-span-2 flex items-end gap-2">
              <div className="w-full">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Date Added Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-hidden focus:border-blue-500 bg-white"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition whitespace-nowrap flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Inventory Data Table (Crisp Clean Pure White Rupee ₹ Layout) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 pl-6 min-w-[220px]">Product & SKU / Barcode</th>
                <th className="p-3.5 min-w-[130px]">Category</th>
                <th className="p-3.5 min-w-[90px]">Unit / Pack</th>
                <th className="p-3.5 min-w-[140px]">Stock Level</th>
                <th className="p-3.5 min-w-[110px]">Stock Status</th>
                <th className="p-3.5 min-w-[100px]">Selling Price</th>
                {isAdmin && <th className="p-3.5 min-w-[90px]">Cost Price</th>}
                {isAdmin && <th className="p-3.5 min-w-[100px]">Margin (₹ / %)</th>}
                {isAdmin && <th className="p-3.5 min-w-[110px]">Stock Value</th>}
                <th className="p-3.5 min-w-[120px]">Supplier & Expiry</th>
                <th className="p-3.5 pr-6 text-right min-w-[150px]">Shopfloor Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400 bg-white">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading inventory items...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-500 bg-white">
                    <div className="max-w-xs mx-auto space-y-3">
                      <Package className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No products found</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search criteria, or click &ldquo;Add Product&rdquo; to create a new item.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearFilters}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level;
                  const isOut = p.stock_quantity <= 0;

                  return (
                    <tr key={p.id} className="bg-white hover:bg-slate-50/90 transition group">
                      {/* Product Name & SKU / Barcode */}
                      <td className="p-3.5 pl-6">
                        <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {p.sku}
                          </span>
                          {p.barcode && (
                            <span className="font-mono text-[10px] text-slate-400">
                              | {p.barcode}
                            </span>
                          )}
                          {p.sub_category && (
                            <span className="text-[10px] text-slate-400">• {p.sub_category}</span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-200">
                          {p.category}
                        </span>
                      </td>

                      {/* Unit & Bulk Pack Size */}
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{p.unit}</div>
                        {p.bulk_pack_size > 1 && (
                          <div className="text-[10px] text-slate-400">Pack of {p.bulk_pack_size}</div>
                        )}
                      </td>

                      {/* Stock Level & Threshold */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">
                            {p.stock_quantity.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            (Min: {p.reorder_level})
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            isOut
                              ? "bg-red-50 text-red-700 border-red-200"
                              : isLow
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOut ? "bg-red-600" : isLow ? "bg-amber-600" : "bg-emerald-600"
                            }`}
                          />
                          {isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK"}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-blue-700 text-xs">
                          ₹{p.selling_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Cost Price (Admin) */}
                      {isAdmin && (
                        <td className="p-3.5">
                          <span className="font-mono text-slate-600 font-medium">
                            ₹{p.cost_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      )}

                      {/* Profit Margin (Admin) */}
                      {isAdmin && (
                        <td className="p-3.5">
                          {p.profit_margin !== undefined && (
                            <div>
                              <span className="font-mono font-bold text-emerald-700">
                                +₹{p.profit_margin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({p.profit_margin_percent}%)
                              </span>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Stock Value (Admin) */}
                      {isAdmin && (
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-slate-900">
                            ₹{p.stock_cost_value?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      )}

                      {/* Supplier & Expiry */}
                      <td className="p-3.5">
                        <div className="text-slate-700 font-medium truncate max-w-[140px]">
                          {p.supplier || "-"}
                        </div>
                        {p.expiry_date && (
                          <div className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Exp: {p.expiry_date}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenStockAdjustModal(p)}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                            title="Quick Stock In / Out"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenEditModal(p)}
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                            title="Edit Product Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {onOpenTasksModal && (
                            <button
                              onClick={() => onOpenTasksModal(p.id, p.name)}
                              className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition"
                              title="Dispatch Work Order / Instruction for this item"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                              title="Move to Recycle Bin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Showing {Math.min((page - 1) * limit + 1, totalCount)} to {Math.min(page * limit, totalCount)} of {totalCount} total items
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs outline-hidden font-medium"
            >
              <option value="15">15 rows per page</option>
              <option value="30">30 rows per page</option>
              <option value="50">50 rows per page</option>
              <option value="100">100 rows per page</option>
            </select>

            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="font-medium text-slate-600 px-1">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Admin Soft-Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Move to Recycle Bin?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove <strong>{productToDelete.name}</strong> ({productToDelete.sku})? It will be safely moved to the Recycle Bin and can be restored at any time.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isDeleting ? "Moving..." : "Move to Recycle Bin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
