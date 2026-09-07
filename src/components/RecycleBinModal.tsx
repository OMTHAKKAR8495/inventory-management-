"use client";

import React, { useState, useEffect } from "react";
import { Trash2, RotateCcw, AlertTriangle, X, Check, Package, RefreshCw } from "lucide-react";
import { Product } from "@/lib/types";

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({ isOpen, onClose, onRestored }) => {
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purgingId, setPurgingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchTrash = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/products?show_trash=true&all=true");
      if (!res.ok) throw new Error("Failed to load trash");
      const data = await res.json();
      setDeletedProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
    }
  }, [isOpen]);

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

  const handleRestore = async (product: Product) => {
    setRestoringId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore");

      fetchTrash();
      onRestored();
    } catch (err: any) {
      alert(err.message || "Failed to restore product");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePurge = async (product: Product) => {
    if (!confirm(`Are you sure you want to PERMANENTLY purge '${product.name}'? This action cannot be undone.`)) {
      return;
    }

    setPurgingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}?purge=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to purge");

      fetchTrash();
      onRestored();
    } catch (err: any) {
      alert(err.message || "Failed to purge product");
    } finally {
      setPurgingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-red-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Recycle Bin & Soft-Deleted Items</h3>
              <p className="text-xs text-slate-300">
                Restore accidentally deleted products or permanently purge them
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading recycle bin...
            </div>
          ) : deletedProducts.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">Recycle bin is empty</p>
              <p className="text-xs text-slate-400">No deleted products are currently in the safety bin.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {deletedProducts.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                      <span>SKU: {p.sku}</span>
                      <span>•</span>
                      <span>{p.category}</span>
                      <span>•</span>
                      <span>Deleted: {p.deleted_at ? new Date(p.deleted_at).toLocaleDateString() : "Recently"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(p)}
                      disabled={restoringId === p.id}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                      title="Restore product to catalog"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {restoringId === p.id ? "Restoring..." : "Restore"}
                    </button>

                    <button
                      onClick={() => handlePurge(p)}
                      disabled={purgingId === p.id}
                      className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                      title="Permanently purge from database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {purgingId === p.id ? "Purging..." : "Purge"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
