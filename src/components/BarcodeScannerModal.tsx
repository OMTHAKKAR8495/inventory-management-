"use client";

import React, { useState, useEffect } from "react";
import { ScanBarcode, Search, X, Check, ArrowRight, Package, PlusCircle, AlertCircle } from "lucide-react";
import { Product } from "@/lib/types";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onProductFound }) => {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleScanOrSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setIsSearching(true);
    setErrorMsg("");
    setScannedProduct(null);

    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(barcodeInput.trim())}&limit=1`);
      const data = await res.json();
      if (!res.ok) throw new Error("Search failed");

      if (data.products && data.products.length > 0) {
        setScannedProduct(data.products[0]);
      } else {
        setErrorMsg(`No product found matching barcode / SKU "${barcodeInput.trim()}".`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to search barcode");
    } finally {
      setIsSearching(false);
    }
  };

  const sampleBarcodes = [
    { label: "Basmati Rice 25kg", code: "8901030384711" },
    { label: "Sunflower Oil 15L", code: "8901030384717" },
    { label: "Wheat Flour 10kg", code: "8901030384713" },
    { label: "Toor Dal 25kg", code: "8901030384714" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal rounded-3xl max-w-lg w-full shadow-2xl border border-white/10 overflow-hidden animate-fade-in my-8 text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-slate-800/40 border-b border-white/10 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Shopfloor Barcode Scanner</h3>
              <p className="text-xs text-slate-400">Scan or type EAN/UPC barcode or SKU code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleScanOrSearch} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Scan Barcode with Handheld Gun or Enter Code:
            </label>
            <div className="relative">
              <ScanBarcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="e.g. 8901030384711 or GRN-BAS-25KG"
                className="w-full pl-11 pr-24 py-3 rounded-2xl border-2 border-blue-500/50 glass-input focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 font-mono font-bold text-sm"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-blue-600/20"
              >
                {isSearching ? "Searching..." : "Lookup"}
              </button>
            </div>
          </form>

          {/* Quick Barcode Simulator Buttons */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Test Barcodes (1-Click):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleBarcodes.map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => setBarcodeInput(b.code)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              {errorMsg}
            </div>
          )}

          {/* Result Card */}
          {scannedProduct && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Product Matched
                  </span>
                  <h4 className="text-sm font-bold text-slate-100 mt-1">{scannedProduct.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                    <span>SKU: {scannedProduct.sku}</span>
                    <span>•</span>
                    <span>{scannedProduct.category}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Available Stock</span>
                  <div className="text-lg font-black text-emerald-400">
                    {scannedProduct.stock_quantity} {scannedProduct.unit}
                  </div>
                  <div className="text-xs font-bold text-amber-400 font-mono">
                    ₹{scannedProduct.selling_price.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Scanned Product */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onProductFound(scannedProduct);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-blue-600/20 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  Select for Quick Stock In / Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
