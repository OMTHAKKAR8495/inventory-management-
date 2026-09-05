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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              Procurement Management
            </span>
            <span className="text-xs text-slate-500 font-medium">Auto Reorder & Inward Goods</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            Supplier Purchase Orders (PO)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchOrders}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
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
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading purchase orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="col-span-full py-16 bg-white rounded-3xl border border-slate-200 text-center p-8 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Purchase Orders Created</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click &ldquo;Scan & Auto-Generate POs&rdquo; to scan low-stock goods and create grouped orders for millers & distributors.
            </p>
            <button
              onClick={handleAutoGenerate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
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
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                        {po.supplier_name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isReceived
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {isReceived ? "Received & In Stock" : "Pending Shipment"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">PO Number:</span>
                      <span className="font-mono font-bold text-slate-800">{po.po_number}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Items Count:</span>
                      <span className="font-bold text-slate-800">{po.items_count} SKU lines</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Estimated Cost:</span>
                      <span className="font-mono font-black text-indigo-700 text-sm">
                        ₹{po.total_estimated_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Created:</span>
                      <span>{new Date(po.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {po.items && po.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Included Products:
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {po.items.map((it) => (
                          <div key={it.id} className="text-[11px] text-slate-600 flex justify-between">
                            <span className="truncate pr-2">{it.product_name}</span>
                            <span className="font-bold text-slate-800 shrink-0">
                              +{it.reorder_quantity} qty
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedPO(po)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>

                  {!isReceived ? (
                    <button
                      onClick={() => handleReceiveShipment(po.id)}
                      disabled={receivingId === po.id}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      {receivingId === po.id ? "Inwarding..." : "Receive & Stock"}
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8 text-slate-900">
            <div className="px-6 py-4 bg-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Purchase Order #{selectedPO.po_number}</h3>
                <p className="text-xs text-indigo-200">{selectedPO.supplier_name}</p>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="text-white hover:text-indigo-200 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400">Supplier:</span>
                  <p className="font-bold text-slate-900">{selectedPO.supplier_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <p className="font-bold uppercase text-indigo-700">{selectedPO.status}</p>
                </div>
                <div>
                  <span className="text-slate-400">Total Order Amount:</span>
                  <p className="font-black text-indigo-700 text-sm">
                    ₹{selectedPO.total_estimated_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Order Date:</span>
                  <p className="font-bold text-slate-800">{new Date(selectedPO.created_at).toLocaleString()}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Order Items ({selectedPO.items?.length || 0})
              </h4>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                {selectedPO.items?.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-900">{it.product_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        SKU: {it.sku} • Current Stock: {it.current_stock}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-700">+{it.reorder_quantity} units</p>
                      <p className="text-[11px] text-slate-500">
                        ₹{it.estimated_unit_cost} ea = ₹{it.total_estimated_cost.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedPO(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
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
