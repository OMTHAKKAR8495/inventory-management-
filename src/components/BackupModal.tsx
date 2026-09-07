"use client";

import React, { useState, useEffect } from "react";
import { Database, Download, Plus, HardDrive, Check, AlertCircle, RefreshCw, X } from "lucide-react";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Failed to load backups");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
      setMessage(null);
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

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create backup");

      setMessage({ type: "success", text: data.message });
      
      // Automatically download JSON backup to client device
      if (data.snapshotData) {
        try {
          const blob = new Blob([JSON.stringify(data.snapshotData, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.backup?.filename || `backup-cloud-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {}
      }

      fetchBackups();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal rounded-3xl max-w-xl w-full shadow-2xl border border-white/10 overflow-hidden animate-fade-in my-8 text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-blue-900/60 to-indigo-900/60 border-b border-white/10 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Database Backups & Safety Snapshots</h3>
              <p className="text-xs text-slate-400">Export live Supabase PostgreSQL snapshots to ensure 100% data safety</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-red-500/10 text-red-300 border-red-500/30"
            }`}
          >
            {message.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cloud Snapshots ({backups.length})</h4>
              <p className="text-[11px] text-slate-400">Live tables: Products, Stock Logs, Khata, POs & Invoices</p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreating ? "Snapshotting..." : "Create Backup Now"}
            </button>
          </div>

          <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden max-h-60 overflow-y-auto bg-white/5">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading snapshots...</div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Click &ldquo;Create Backup Now&rdquo; to snapshot and download your complete database to your computer.
              </div>
            ) : (
              backups.map((b) => (
                <div key={b.filename} className="p-3.5 flex items-center justify-between hover:bg-white/5 transition">
                  <div className="flex items-center gap-2.5">
                    <HardDrive className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs font-bold font-mono text-slate-200">{b.filename}</p>
                      <p className="text-[10px] text-slate-400">
                        Size: {(b.size / 1024).toFixed(1)} KB • {new Date(b.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      PostgreSQL
                    </span>
                    <a
                      href={`/api/backup?download=${encodeURIComponent(b.filename)}`}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Download backup file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

