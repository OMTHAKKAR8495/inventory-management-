"use client";

import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const currentQty = product.stock_quantity;
  const adjustQty = parseInt(quantity, 10) || 0;
  const newQty = type === "stock_in" ? currentQty + adjustQty : Math.max(0, currentQty - adjustQty);

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal rounded-3xl max-w-lg w-full shadow-2xl border border-white/10 overflow-hidden animate-fade-in my-8 text-slate-100">
        {/* Header with quick Save Changes action */}
        <div className={`px-6 py-4 text-white flex items-center justify-between border-b border-white/10 ${
          type === "stock_in" ? "bg-emerald-500/20" : "bg-red-500/20"
        } transition-colors`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              type === "stock_in" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-red-500/20 border-red-500/30 text-red-400"
            }`}>
              {type === "stock_in" ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {type === "stock_in" ? "Stock In (Add Units)" : "Stock Out (Remove Units)"}
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{product.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => handleSubmit(e)}
              disabled={isSubmitting}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 ${
                type === "stock_in"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  : "bg-red-500 hover:bg-red-400 text-white"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
            <button
              type="button"
              onClick={() => setType("stock_in")}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                type === "stock_in"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
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
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              Stock Out (-)
            </button>
          </div>

          {/* Current vs Projected Calculation */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">On Hand</span>
              <div className="text-xl font-bold text-slate-100">{currentQty} {product.unit}</div>
            </div>
            <div className="flex items-center text-slate-500 font-bold px-2">
              <span className="text-sm mr-2">{type === "stock_in" ? "+" : "-"}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Projected Stock</span>
              <div className={`text-xl font-black ${
                newQty <= 0 ? "text-red-400" : newQty <= product.reorder_level ? "text-amber-400" : "text-emerald-400"
              }`}>
                {newQty} {product.unit}
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Quantity to {type === "stock_in" ? "Add" : "Deduct"} ({product.unit}) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2.5 text-base font-bold rounded-xl glass-input"
            />

            {/* Quick Increment buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Quick:</span>
              {quickIncrements.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setQuantity(inc.toString())}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition"
                >
                  +{inc}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Adjustment Reason <span className="text-red-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl glass-input font-medium"
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
                className="mt-2 w-full px-3.5 py-2 text-xs rounded-xl glass-input"
              />
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 ${
                type === "stock_in"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20"
              }`}
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? "Saving..." : "Confirm & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
