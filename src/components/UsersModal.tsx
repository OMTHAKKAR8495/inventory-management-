"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Users,
  UserPlus,
  Shield,
  UserCheck,
  UserX,
  Check,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Lock,
  Search,
} from "lucide-react";
import { User } from "@/lib/types";

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
}

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivated">("all");

  // Deactivation confirmation state
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Form State for creating a new user
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "admin">("manager");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      setUserToDeactivate(null);
      setUserToDelete(null);
      setMsg(null);
      setSearchQuery("");
      setStatusFilter("all");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (userToDeactivate) {
          setUserToDeactivate(null);
        } else if (userToDelete) {
          setUserToDelete(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, userToDeactivate, userToDelete]);

  if (!isOpen || !isMounted) return null;

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

  // Toggle user status (Deactivate / Reactivate)
  const handleToggleStatus = async (targetUser: User, newStatus: "active" | "deactivated") => {
    setIsUpdatingStatus(targetUser.id);
    setMsg(null);

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user status");

      setMsg({ type: "success", text: data.message });
      setUserToDeactivate(null);
      fetchUsers();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Permanently delete user
  const handleDeleteUser = async (targetUser: User) => {
    setIsUpdatingStatus(targetUser.id);
    setMsg(null);

    try {
      const res = await fetch(`/api/users?userId=${targetUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user account");

      setMsg({ type: "success", text: data.message });
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const isMatchQuery =
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase().trim());

    if (!isMatchQuery) return false;

    if (statusFilter === "active") return u.status === "active";
    if (statusFilter === "deactivated") return u.status !== "active";
    return true;
  });

  const activeCount = users.filter((u) => u.status === "active").length;
  const deactivatedCount = users.filter((u) => u.status !== "active").length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="glass-modal rounded-3xl max-w-2xl w-full shadow-2xl border border-white/10 overflow-hidden text-slate-100 max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-blue-500/20 border-b border-white/10 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Staff & User Management</h3>
              <p className="text-xs text-slate-400">
                Manage accounts, grant permissions, and deactivate IDs when staff leaves
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Banner */}
        {msg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border shrink-0 animate-fade-in ${
              msg.type === "success"
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                : "bg-red-950/60 text-red-300 border-red-500/30"
            }`}
          >
            {msg.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Action Bar & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Staff Accounts ({users.length})
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    statusFilter === "active"
                      ? "bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Active ({activeCount})
                </button>
                {deactivatedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("deactivated")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      statusFilter === "deactivated"
                        ? "bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/40"
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    Deactivated ({deactivatedCount})
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setUserToDeactivate(null);
                setUserToDelete(null);
              }}
              className="px-3.5 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {showAddForm ? "Close Form" : "Add New Staff Member"}
            </button>
          </div>

          {/* Inline Deactivation Confirmation Banner */}
          {userToDeactivate && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200 space-y-3 animate-fade-in shadow-xl">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Confirm Staff ID Deactivation</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Are you sure you want to deactivate <strong>{userToDeactivate.name}</strong> ({userToDeactivate.email})?
                <br />
                Their login access will be <strong>revoked immediately</strong>. If they have left the store, they will not be able to view inventory, modify stock, or access the POS. You can reactivate their account at any time.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setUserToDeactivate(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus === userToDeactivate.id}
                  onClick={() => handleToggleStatus(userToDeactivate, "deactivated")}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
                >
                  <UserX className="w-3.5 h-3.5" />
                  {isUpdatingStatus === userToDeactivate.id ? "Deactivating..." : "Yes, Deactivate Staff ID"}
                </button>
              </div>
            </div>
          )}

          {/* Inline Delete Confirmation Banner */}
          {userToDelete && (
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/40 text-xs text-red-200 space-y-3 animate-fade-in shadow-xl">
              <div className="flex items-center gap-2 font-bold text-red-300">
                <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                <span>Permanently Remove Staff Account</span>
              </div>
              <p className="text-[11px] text-red-200/90 leading-relaxed">
                Permanently delete account for <strong>{userToDelete.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus === userToDelete.id}
                  onClick={() => handleDeleteUser(userToDelete)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isUpdatingStatus === userToDelete.id ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 animate-fade-in">
              <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-purple-400" />
                Create New Staff Credentials
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
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
                    placeholder="e.g. ramesh@ashastore.com"
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
                    <option value="manager">Inventory Manager (Stock & Catalog Operations)</option>
                    <option value="admin">Store Administrator (Full POS, Profit & Staff Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>
          )}

          {/* Quick Search */}
          {users.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name or email..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input font-medium placeholder:text-slate-500"
              />
            </div>
          )}

          {/* Users List */}
          <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-white/5">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading staff accounts...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No accounts match the current filter.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isCurrentUser = currentUser && currentUser.id === u.id;
                const isActive = u.status === "active";

                return (
                  <div
                    key={u.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 transition ${
                      !isActive ? "opacity-75 bg-rose-950/10" : ""
                    }`}
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md ${
                          !isActive
                            ? "bg-slate-700 text-slate-400"
                            : u.role === "admin"
                            ? "bg-purple-600 shadow-purple-600/20"
                            : "bg-emerald-600 shadow-emerald-600/20"
                        }`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-bold truncate ${isActive ? "text-slate-100" : "text-slate-400 line-through"}`}>
                            {u.name}
                          </h4>
                          {isCurrentUser && (
                            <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.2 rounded-md">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>

                    {/* Roles, Status & Action Controls */}
                    <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3 self-end sm:self-auto">
                      {/* Role Pill */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          u.role === "admin"
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {u.role === "admin" ? "Admin" : "Inventory Manager"}
                      </span>

                      {/* Status Indicator */}
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Deactivated
                        </span>
                      )}

                      {/* Action Buttons (Deactivate / Reactivate) */}
                      {!isCurrentUser && (
                        <div className="flex items-center gap-1.5">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                setUserToDeactivate(u);
                                setUserToDelete(null);
                              }}
                              disabled={isUpdatingStatus === u.id}
                              className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Deactivate staff ID (e.g. staff member left the store)"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Deactivate ID</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u, "active")}
                              disabled={isUpdatingStatus === u.id}
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Reactivate staff ID and restore login access"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{isUpdatingStatus === u.id ? "Reactivating..." : "Reactivate ID"}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setUserToDelete(u);
                              setUserToDeactivate(null);
                            }}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition cursor-pointer"
                            title="Delete staff record permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
