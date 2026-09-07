"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  PlusCircle,
  Truck,
  CheckCircle2,
  AlertCircle,
  Download,
  PackageCheck,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  Send,
  Eye,
  X,
} from "lucide-react";
import { PurchaseOrder, User } from "@/lib/types";

interface PurchaseOrdersViewProps {
  user: User;
  onRestocked?: () => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({ user, onRestocked }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/procurement/purchase-orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.purchaseOrders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedPO) {
        setSelectedPO(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPO]);

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_generate" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate POs");

      setMessage({ type: "success", text: data.message });
      fetchOrders();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to generate POs" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReceiveShipment = async (poId: string) => {
    setReceivingId(poId);
    setMessage(null);
    try {
      const res = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive_shipment", poId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to receive shipment");

      setMessage({ type: "success", text: data.message });
      fetchOrders();
      if (onRestocked) onRestocked();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              Procurement Management
            </span>
            <span className="text-xs text-slate-400 font-medium">Auto Reorder & Inward Goods</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-400" />
            Supplier Purchase Orders (PO)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchOrders}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            {isGenerating ? "Scanning Stock..." : "Scan & Auto-Generate POs"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
              : "bg-red-950/50 text-red-300 border-red-500/30"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
          {message.text}
        </div>
      )}

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            Loading purchase orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="col-span-full py-16 glass-panel rounded-3xl border border-white/10 text-center p-8 space-y-3 shadow-lg">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No Purchase Orders Created</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click &ldquo;Scan & Auto-Generate POs&rdquo; to scan low-stock goods and create grouped orders for millers & distributors.
            </p>
            <button
              onClick={handleAutoGenerate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              Generate First PO Batch
            </button>
          </div>
        ) : (
          orders.map((po) => {
            const isReceived = po.status === "received";

            return (
              <div
                key={po.id}
                className="glass-panel rounded-3xl p-5 border border-white/10 shadow-lg hover:border-white/20 transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[170px]">
                        {po.supplier_name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        isReceived
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {isReceived ? "Received & In Stock" : "Pending Shipment"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">PO Number:</span>
                      <span className="font-mono font-bold text-slate-200">{po.po_number}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Items Count:</span>
                      <span className="font-bold text-slate-200">{po.items_count} SKU lines</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Estimated Cost:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        ₹{po.total_estimated_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Created:</span>
                      <span>{new Date(po.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {po.items && po.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Included Products:
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {po.items.map((it) => (
                          <div key={it.id} className="text-[11px] text-slate-300 flex justify-between">
                            <span className="truncate pr-2">{it.product_name}</span>
                            <span className="font-bold text-amber-400 shrink-0 font-mono">
                              +{it.reorder_quantity} qty
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedPO(po)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/10"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>

                  {!isReceived ? (
                    <button
                      onClick={() => handleReceiveShipment(po.id)}
                      disabled={receivingId === po.id}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      {receivingId === po.id ? "Inwarding..." : "Receive & Stock"}
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Stock Added
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PO Detail View Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-xl w-full shadow-2xl border border-white/10 overflow-hidden animate-fade-in my-8 text-slate-100">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-slate-800/40 border-b border-white/10 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Purchase Order #{selectedPO.po_number}</h3>
                <p className="text-xs text-indigo-300">{selectedPO.supplier_name}</p>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10 text-xs">
                <div>
                  <span className="text-slate-400">Supplier:</span>
                  <p className="font-bold text-slate-200">{selectedPO.supplier_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <p className="font-bold uppercase text-indigo-400">{selectedPO.status}</p>
                </div>
                <div>
                  <span className="text-slate-400">Total Order Amount:</span>
                  <p className="font-black text-amber-400 text-sm font-mono">
                    ₹{selectedPO.total_estimated_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Order Date:</span>
                  <p className="font-bold text-slate-200">{new Date(selectedPO.created_at).toLocaleString()}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Order Items ({selectedPO.items?.length || 0})
              </h4>

              <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden text-xs bg-white/5">
                {selectedPO.items?.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between hover:bg-white/5">
                    <div>
                      <p className="font-bold text-slate-200">{it.product_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        SKU: {it.sku} • Current Stock: {it.current_stock}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-400">+{it.reorder_quantity} units</p>
                      <p className="text-[11px] text-slate-400">
                        ₹{it.estimated_unit_cost} ea = ₹{it.total_estimated_cost.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedPO(null)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
