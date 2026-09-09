"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  History,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RotateCcw,
  Calendar,
  Package,
  Wrench,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Check,
  AlertTriangle,
} from "lucide-react";
import { StockLog, User, Product } from "@/lib/types";

interface AuditLogsViewProps {
  user?: User | null;
  onLogResolved?: () => void;
  initialSearch?: string;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  user,
  onLogResolved,
  initialSearch = "",
}) => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [changeType, setChangeType] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      setPage(1);
    }
  }, [initialSearch]);

  // Resolution Modal State for Admin
  const [resolvingLog, setResolvingLog] = useState<StockLog | null>(null);
  const [resolutionType, setResolutionType] = useState<"transfer" | "revert" | "adjust">("transfer");
  const [targetProductId, setTargetProductId] = useState<string>("");
  const [productSearch, setProductSearch] = useState<string>("");
  const [customQuantity, setCustomQuantity] = useState<string>("");
  const [reasonNotes, setReasonNotes] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [resolutionFeedback, setResolutionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isAdmin = user?.role === "admin";

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (changeType && changeType !== "all") params.set("change_type", changeType);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit logs");
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, changeType, page, limit]);

  useEffect(() => {
    if (resolvingLog) {
      if (products.length === 0) {
        fetch("/api/products?all=true")
          .then((res) => res.json())
          .then((data) => setProducts(data.products || []))
          .catch((e) => console.error(e));
      }
      setProductSearch("");
    }
  }, [resolvingLog]);

  const handleConfirmResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingLog) return;

    setIsSubmittingResolution(true);
    setResolutionFeedback(null);

    try {
      const res = await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: resolvingLog.id,
          resolutionType,
          targetProductId: resolutionType === "transfer" ? targetProductId : undefined,
          customQuantity: resolutionType === "adjust" ? customQuantity : undefined,
          reasonNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve log mistake");

      setResolutionFeedback({ type: "success", message: data.message });
      fetchLogs();
      if (onLogResolved) onLogResolved();
      setTimeout(() => {
        setResolvingLog(null);
        setResolutionFeedback(null);
        setTargetProductId("");
        setProductSearch("");
        setReasonNotes("");
      }, 1500);
    } catch (err: any) {
      setResolutionFeedback({ type: "error", message: err.message });
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const selectedTargetProduct = products.find((p) => p.id === targetProductId);

  const filteredTransferProducts = products.filter((p) => {
    if (resolvingLog && p.id === resolvingLog.product_id) return false;
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.sub_category && p.sub_category.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const getBadgeForChangeType = (type: string) => {
    switch (type) {
      case "stock_in":
        return { label: "Stock In (+)", bg: "bg-emerald-100 text-emerald-800" };
      case "stock_out":
        return { label: "Stock Out (-)", bg: "bg-red-100 text-red-800" };
      case "bulk_import":
        return { label: "Bulk Ingestion", bg: "bg-blue-100 text-blue-800" };
      case "product_created":
        return { label: "New Item Created", bg: "bg-purple-100 text-purple-800" };
      case "product_edited":
        return { label: "Details Updated", bg: "bg-slate-100 text-slate-800" };
      default:
        return { label: "Adjustment", bg: "bg-amber-100 text-amber-800" };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 sm:p-7 border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 shrink-0" />
            Stock Movement & Audit Logs
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isAdmin
              ? "Complete timestamped history of all stock-ins, sales deductions, customer orders, bulk imports, and adjustments."
              : "Timestamped history of stock additions, inward shipments, received POs, and catalog entries."}
          </p>
        </div>
      </div>

      {/* Notice for Manager on resolving mistakes */}
      {!isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Made an entry mistake?</strong> Store Administrators have direct tools here to <strong>Revert</strong> or <strong>Transfer</strong> mistaken stock quantities to the correct item. Log in as Store Administrator (<code>ashastore@gmail.com</code>) to resolve.
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel rounded-3xl p-4 border border-white/10 shadow-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={
              isAdmin
                ? "Search by product name, staff member, or reason..."
                : "Search by product name or inward entry reason..."
            }
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden bg-slate-900/60 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={changeType}
            onChange={(e) => {
              setChangeType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 rounded-xl border border-white/10 bg-slate-900 text-xs font-semibold text-slate-200 outline-hidden focus:border-blue-500"
          >
            {isAdmin ? (
              <>
                <option value="all">All Change Types</option>
                <option value="stock_in">Stock In (+)</option>
                <option value="stock_out">Stock Out (-)</option>
                <option value="bulk_import">Bulk Ingestion</option>
                <option value="product_created">Product Created</option>
                <option value="manual_adjustment">Manual Adjustment</option>
              </>
            ) : (
              <>
                <option value="all">All Stock Additions</option>
                <option value="stock_in">Stock In / Restocks (+)</option>
                <option value="bulk_import">Bulk Ingestion</option>
                <option value="product_created">Product Created</option>
              </>
            )}
          </select>

          {(search || changeType !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setChangeType("all");
                setPage(1);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#090e1a]/90 backdrop-blur-md border-b border-white/10 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 pl-6 min-w-[160px]">Timestamp</th>
                <th className="p-3.5 min-w-[200px]">Product Name</th>
                <th className="p-3.5 min-w-[130px]">Staff Member</th>
                <th className="p-3.5 min-w-[130px]">Action Type</th>
                <th className="p-3.5 min-w-[110px]">Quantity Delta</th>
                <th className="p-3.5 min-w-[130px]">Before → After</th>
                <th className="p-3.5 min-w-[200px]">Reason / Notes</th>
                {isAdmin && <th className="p-3.5 pr-6 text-right min-w-[120px]">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="p-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Loading stock audit logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="p-10 text-center text-slate-400">
                    No activity logs matched your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isPositive = log.quantity_delta > 0;
                  const isNegative = log.quantity_delta < 0;
                  const badge = getBadgeForChangeType(log.change_type);

                  return (
                    <tr key={log.id} className="hover:bg-white/5 transition">
                      {/* Timestamp */}
                      <td className="p-3.5 pl-6 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Product Name */}
                      <td className="p-3.5 font-bold text-white">
                        {log.product_name}
                      </td>

                      {/* Staff Member */}
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          {log.user_name}
                        </span>
                      </td>

                      {/* Action Type */}
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Quantity Delta */}
                      <td className="p-3.5 font-black text-xs font-mono">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive
                              ? "text-emerald-400"
                              : isNegative
                              ? "text-red-400"
                              : "text-slate-400"
                          }`}
                        >
                          {isPositive && <ArrowUpRight className="w-3.5 h-3.5" />}
                          {isNegative && <ArrowDownRight className="w-3.5 h-3.5" />}
                          {isPositive ? `+${log.quantity_delta}` : log.quantity_delta}
                        </span>
                      </td>

                      {/* Before / After */}
                      <td className="p-3.5 font-mono text-xs text-slate-300">
                        <span className="text-slate-400">{log.previous_quantity}</span>
                        <span className="mx-1 text-slate-500">→</span>
                        <strong className="text-white font-bold">{log.new_quantity}</strong>
                      </td>

                      {/* Reason */}
                      <td className="p-3.5 text-slate-400 text-xs">
                        {log.reason || "-"}
                      </td>

                      {/* Admin Resolution Action */}
                      {isAdmin && (
                        <td className="p-3.5 pr-6 text-right whitespace-nowrap">
                          {log.reason?.includes("[RESOLVED:") || log.reason?.startsWith("Admin Correction:") ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              {log.reason?.startsWith("Admin Correction:") ? "Correction" : "Resolved"}
                            </span>
                          ) : log.quantity_delta !== 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingLog(log);
                                setResolutionType("transfer");
                                setTargetProductId("");
                                setCustomQuantity(log.previous_quantity?.toString() || "0");
                                setReasonNotes("");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/30 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="Resolve / Correct this mistaken stock movement"
                            >
                              <Wrench className="w-3 h-3 text-amber-400" />
                              Resolve
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[10px]">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#090e1a]/80 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Total {total} stock movement records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 font-bold text-slate-300 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="font-bold text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 font-bold text-slate-300 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Resolve Stock Movement Mistake Modal (Admin Only) */}
      {resolvingLog && isMounted && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="glass-modal rounded-3xl max-w-xl w-full shadow-2xl border border-white/10 overflow-hidden text-slate-100 max-h-[90vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-blue-600/20 border-b border-amber-500/20 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-100">
                    Resolve Stock Movement Mistake
                  </h3>
                  <p className="text-[11px] text-amber-300/80">
                    Administrator Stock Correction & Audit Reconciliation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingResolution) {
                    setResolvingLog(null);
                    setResolutionFeedback(null);
                    setProductSearch("");
                  }
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleConfirmResolution} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
              {resolutionFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    resolutionFeedback.type === "success"
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/20 border-red-500/30 text-red-300"
                  }`}
                >
                  {resolutionFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{resolutionFeedback.message}</span>
                </div>
              )}

              {/* Log Entry Summary */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mistaken Product:</span>
                  <span className="font-bold text-white text-right">{resolvingLog.product_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Movement Recorded:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {resolvingLog.quantity_delta > 0 ? `+${resolvingLog.quantity_delta}` : resolvingLog.quantity_delta} units ({resolvingLog.previous_quantity} → {resolvingLog.new_quantity})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Recorded By:</span>
                  <span className="text-slate-200">{resolvingLog.user_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Original Reason:</span>
                  <span className="text-slate-300 italic">{resolvingLog.reason || "N/A"}</span>
                </div>
              </div>

              {/* Resolution Strategy Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Select Resolution Action:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionType("transfer")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      resolutionType === "transfer"
                        ? "bg-blue-600/30 border-blue-500 text-blue-200 ring-1 ring-blue-500/50"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                    <span>Transfer to Intended Item</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionType("revert")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      resolutionType === "revert"
                        ? "bg-rose-600/30 border-rose-500 text-rose-200 ring-1 ring-rose-500/50"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span>Undo / Revert Movement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionType("adjust")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      resolutionType === "adjust"
                        ? "bg-amber-600/30 border-amber-500 text-amber-200 ring-1 ring-amber-500/50"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <Package className="w-4 h-4 text-amber-400" />
                    <span>Set Exact Count</span>
                  </button>
                </div>
              </div>

              {/* Resolution Details Form */}
              {resolutionType === "transfer" && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-3">
                  <p className="text-xs text-blue-300 font-bold flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4" />
                    Transfer {resolvingLog.quantity_delta > 0 ? `+${resolvingLog.quantity_delta}` : resolvingLog.quantity_delta} units to Intended Product
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-300">
                        Search & Select Intended Product: <span className="text-red-400">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {filteredTransferProducts.length} item{filteredTransferProducts.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Instant Live Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Type product name or SKU to search (e.g. Pure Cow Ghee)..."
                        className="w-full pl-9 pr-8 py-2 text-xs rounded-xl glass-input font-medium placeholder:text-slate-500 text-white focus:ring-2 focus:ring-blue-500/40"
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtered Interactive Product List */}
                    <div className="max-h-44 overflow-y-auto custom-scrollbar border border-white/10 rounded-xl bg-slate-900/90 divide-y divide-white/5 shadow-inner">
                      {filteredTransferProducts.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs space-y-1">
                          <p>No products found matching &ldquo;{productSearch}&rdquo;</p>
                          <button
                            type="button"
                            onClick={() => setProductSearch("")}
                            className="text-blue-400 hover:underline text-[11px] cursor-pointer"
                          >
                            Clear search
                          </button>
                        </div>
                      ) : (
                        filteredTransferProducts.map((p) => {
                          const isSelected = p.id === targetProductId;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setTargetProductId(p.id);
                              }}
                              className={`w-full p-2.5 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600/30 text-white font-bold border-l-4 border-blue-400"
                                  : "hover:bg-white/5 text-slate-200"
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold truncate text-white flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono bg-white/5 px-1 py-0.2 rounded border border-white/5 text-slate-300">{p.sku}</span>
                                  <span>•</span>
                                  <span className="truncate">{p.category}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-[11px] font-bold text-slate-200">
                                  {p.stock_quantity} {p.unit}
                                </span>
                                <div className="text-[9px] text-slate-400 uppercase tracking-wider">In Stock</div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Transfer Summary Preview Card */}
                  {targetProductId && selectedTargetProduct ? (
                    <div className="p-3 rounded-xl bg-blue-950/70 border border-blue-500/30 text-[11px] text-blue-200 space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between pb-1 border-b border-blue-500/20">
                        <span className="text-[10px] uppercase font-bold text-blue-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Selected Target Product
                        </span>
                        <button
                          type="button"
                          onClick={() => setTargetProductId("")}
                          className="text-[10px] text-blue-400 hover:text-blue-200 underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                      <p className="font-bold text-xs text-white">
                        {selectedTargetProduct.name}
                      </p>
                      <div className="space-y-0.5 pt-0.5">
                        <p>
                          ✓ <strong>{resolvingLog.product_name}</strong> will revert by{" "}
                          <span className="text-rose-400 font-bold font-mono">
                            {-resolvingLog.quantity_delta > 0 ? `+${-resolvingLog.quantity_delta}` : -resolvingLog.quantity_delta} units
                          </span>{" "}
                          (back to {resolvingLog.previous_quantity} units).
                        </p>
                        <p>
                          ✓ <strong>{selectedTargetProduct.name}</strong> will receive{" "}
                          <span className="text-emerald-400 font-bold font-mono">
                            {resolvingLog.quantity_delta > 0 ? `+${resolvingLog.quantity_delta}` : resolvingLog.quantity_delta} units
                          </span>{" "}
                          (moving from {selectedTargetProduct.stock_quantity} → {selectedTargetProduct.stock_quantity + resolvingLog.quantity_delta} {selectedTargetProduct.unit}).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">
                      Click any product from the list above to assign the {resolvingLog.quantity_delta > 0 ? `+${resolvingLog.quantity_delta}` : resolvingLog.quantity_delta} units to it.
                    </p>
                  )}
                </div>
              )}

              {resolutionType === "revert" && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2">
                  <p className="text-xs text-rose-300 font-bold flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4" />
                    Revert & Reverse Stock Movement
                  </p>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    This will reverse the mistaken {resolvingLog.quantity_delta > 0 ? `+${resolvingLog.quantity_delta}` : resolvingLog.quantity_delta} units on{" "}
                    <strong>{resolvingLog.product_name}</strong>, restoring its stock back to its count prior to this entry, and log an audit reversal record.
                  </p>
                </div>
              )}

              {resolutionType === "adjust" && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                  <p className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    Set Exact Verified Physical Count
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Actual Physical Stock in Warehouse:
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={customQuantity}
                      onChange={(e) => setCustomQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono font-bold text-amber-300"
                    />
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Reconciliation Note / Reason <span className="text-slate-500">(Optional)</span>:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inward entry entered for wrong product by staff"
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0 mt-auto">
                <button
                  type="button"
                  disabled={isSubmittingResolution}
                  onClick={() => {
                    setResolvingLog(null);
                    setResolutionFeedback(null);
                    setProductSearch("");
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolution || (resolutionType === "transfer" && !targetProductId)}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isSubmittingResolution ? "Reconciling..." : "Confirm & Resolve Mistake"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
