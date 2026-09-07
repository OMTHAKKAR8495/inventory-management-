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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-blue-300">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Shopfloor Barcode Scanner</h3>
              <p className="text-xs text-blue-200">Scan or type EAN/UPC barcode or SKU code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleScanOrSearch} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
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
                className="w-full pl-11 pr-24 py-3 rounded-2xl border-2 border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-hidden font-mono font-bold text-sm text-slate-900"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {isSearching ? "Searching..." : "Lookup"}
              </button>
            </div>
          </form>

          {/* Quick Barcode Simulator Buttons */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Test Barcodes (1-Click):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleBarcodes.map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => setBarcodeInput(b.code)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 transition"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Result Card */}
          {scannedProduct && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full">
                    Product Matched
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{scannedProduct.name}</h4>
                  <p className="text-xs text-slate-600 font-mono">
                    SKU: {scannedProduct.sku} {scannedProduct.barcode && `• Barcode: ${scannedProduct.barcode}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-slate-900">
                    {scannedProduct.stock_quantity} {scannedProduct.unit}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-700">
                    ₹{scannedProduct.selling_price.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-emerald-200/60">
                <button
                  onClick={() => {
                    onProductFound(scannedProduct);
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
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
