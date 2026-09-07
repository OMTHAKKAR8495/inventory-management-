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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal rounded-3xl max-w-2xl w-full shadow-2xl border border-white/10 overflow-hidden animate-fade-in my-8 text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-slate-800/40 border-b border-white/10 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Recycle Bin & Soft-Deleted Items</h3>
              <p className="text-xs text-slate-400">
                Restore accidentally deleted products or permanently purge them
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              Loading recycle bin...
            </div>
          ) : deletedProducts.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300 text-sm">Recycle bin is empty</p>
              <p className="text-xs text-slate-500">No deleted products are currently in the safety bin.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-white/5">
              {deletedProducts.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
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
                      className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                      title="Restore product to catalog"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {restoringId === p.id ? "Restoring..." : "Restore"}
                    </button>

                    <button
                      onClick={() => handlePurge(p)}
                      disabled={purgingId === p.id}
                      className="px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
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
