"use client";

import React, { useState } from "react";
import { X, Plus, Minus, Check, AlertCircle, ArrowRight } from "lucide-react";
import { Product } from "@/lib/types";

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjust: (productId: string, type: "stock_in" | "stock_out", quantity: number, reason: string) => Promise<boolean>;
}

const COMMON_REASONS = [
  "Received supplier shipment",
  "Sold wholesale batch to retailer",
  "Damaged goods in warehouse",
  "Cycle count & physical audit adjustment",
  "Customer exchange/return",
  "Quality inspection sample",
];

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
  onAdjust,
}) => {
  const [type, setType] = useState<"stock_in" | "stock_out">("stock_in");
  const [quantity, setQuantity] = useState("10");
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !product) return null;

  const currentQty = product.stock_quantity;
  const adjustQty = parseInt(quantity, 10) || 0;
  const newQty = type === "stock_in" ? currentQty + adjustQty : Math.max(0, currentQty - adjustQty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustQty <= 0) {
      setErrorMsg("Quantity must be greater than zero.");
      return;
    }

    const finalReason = reason === "__custom__" ? customReason.trim() : reason;
    if (!finalReason) {
      setErrorMsg("Please specify a reason for this stock change.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const success = await onAdjust(product.id, type, adjustQty, finalReason);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  const quickIncrements = [5, 10, 25, 50, 100];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className={`px-6 py-4 text-white flex items-center justify-between ${
          type === "stock_in" ? "bg-emerald-700" : "bg-red-700"
        } transition-colors`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              {type === "stock_in" ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold">
                {type === "stock_in" ? "Stock In (Add Units)" : "Stock Out (Remove Units)"}
              </h3>
              <p className="text-xs text-white/80 truncate max-w-xs">{product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setType("stock_in")}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                type === "stock_in"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Stock In (+)
            </button>
            <button
              type="button"
              onClick={() => setType("stock_out")}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                type === "stock_out"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              Stock Out (-)
            </button>
          </div>

          {/* Current vs Projected Calculation */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">On Hand</span>
              <div className="text-xl font-bold text-slate-800">{currentQty} {product.unit}</div>
            </div>
            <div className="flex items-center text-slate-400 font-bold px-2">
              <span className="text-sm mr-2">{type === "stock_in" ? "+" : "-"}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Projected Stock</span>
              <div className={`text-xl font-black ${
                newQty <= 0 ? "text-red-600" : newQty <= product.reorder_level ? "text-amber-600" : "text-emerald-600"
              }`}>
                {newQty} {product.unit}
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantity to {type === "stock_in" ? "Add" : "Deduct"} ({product.unit}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2.5 text-base font-bold rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden text-slate-900"
            />

            {/* Quick Increment buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Quick:</span>
              {quickIncrements.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setQuantity(inc.toString())}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  +{inc}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Adjustment Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden bg-white text-slate-900 font-medium"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="__custom__">+ Enter Custom Reason...</option>
            </select>
            {reason === "__custom__" && (
              <input
                type="text"
                placeholder="Type specific reason for audit log"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-2 w-full px-3.5 py-2 text-xs rounded-xl border border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-hidden text-slate-900"
              />
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-2 ${
                type === "stock_in"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:opacity-50`}
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? "Updating..." : `Confirm ${type === "stock_in" ? "Stock-In" : "Stock-Out"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
