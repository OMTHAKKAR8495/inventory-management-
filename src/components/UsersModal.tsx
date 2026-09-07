"use client";

import React, { useState, useEffect } from "react";
import { X, Users, UserPlus, Shield, UserCheck, Check, AlertCircle } from "lucide-react";
import { User } from "@/lib/types";

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "admin">("manager");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load staff members");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setShowAddForm(false);
      setMsg(null);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setMsg({ type: "success", text: data.message });
      setName("");
      setEmail("");
      setPassword("");
      setShowAddForm(false);
      fetchUsers();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal rounded-3xl max-w-2xl w-full shadow-2xl border border-white/10 overflow-hidden animate-fade-in my-8 text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-blue-500/20 border-b border-white/10 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Staff & User Management</h3>
              <p className="text-xs text-slate-400">Manage store managers & system administrators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Banner */}
        {msg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              msg.type === "success"
                ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                : "bg-red-950/50 text-red-300 border-red-500/30"
            }`}
          >
            {msg.type === "success" ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            {msg.text}
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Action to create new staff */}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Store Accounts ({users.length})
            </h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {showAddForm ? "Cancel" : "Add New Staff Member"}
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 animate-fade-in">
              <h5 className="text-xs font-bold text-slate-200">Create Staff Credentials</h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Miller"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jmiller@provision.store"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Role / Permissions</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-medium"
                  >
                    <option value="manager">Inventory Manager (Restricted Financials)</option>
                    <option value="admin">Store Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-purple-600/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>
          )}

          {/* Users List */}
          <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-white/5">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading staff accounts...</div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs ${
                        u.role === "admin" ? "bg-purple-600" : "bg-emerald-600"
                      }`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{u.name}</h4>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        u.role === "admin"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "Inventory Manager"}
                    </span>
                    <span className="text-[10px] text-emerald-400">
                      Active
                    </span>
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
