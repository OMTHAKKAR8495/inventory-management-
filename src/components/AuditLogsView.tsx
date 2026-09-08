"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RotateCcw,
  Calendar,
  Package,
} from "lucide-react";
import { StockLog, User } from "@/lib/types";

interface AuditLogsViewProps {
  user?: User | null;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ user }) => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [changeType, setChangeType] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

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
                <th className="p-3.5 pr-6 min-w-[200px]">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Loading stock audit logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
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
                      <td className="p-3.5 pr-6 text-slate-400 text-xs">
                        {log.reason || "-"}
                      </td>
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
    </div>
  );
};
