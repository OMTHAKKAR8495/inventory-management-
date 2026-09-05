"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  X,
  Filter,
  CheckCheck,
  AlertCircle,
  FileText,
  Truck,
  Sparkles,
  Layers,
} from "lucide-react";
import { ShopfloorTask, User, Product, TaskPriority, TaskCategory } from "@/lib/types";

interface ShopfloorTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  initialProductId?: string | null;
  initialProductName?: string | null;
  onNavigateToStockAdjust?: (productId: string) => void;
  onNavigateToPO?: () => void;
  onTasksUpdated?: () => void;
}

export const ShopfloorTasksModal: React.FC<ShopfloorTasksModalProps> = ({
  isOpen,
  onClose,
  user,
  initialProductId = null,
  initialProductName = null,
  onNavigateToStockAdjust,
  onNavigateToPO,
  onTasksUpdated,
}) => {
  const [tasks, setTasks] = useState<ShopfloorTask[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create Form state
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [category, setCategory] = useState<TaskCategory>("stock_order");
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || "");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = user.role === "admin";

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=200");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
      fetchProducts();
      if (initialProductId) {
        setSelectedProductId(initialProductId);
        setIsComposing(true);
        setTitle(`Reorder / Check stock for ${initialProductName || "Product"}`);
        setCategory("stock_order");
      }
    }
  }, [isOpen, initialProductId, initialProductName]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const relatedProd = products.find((p) => p.id === selectedProductId);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          category,
          relatedProductId: selectedProductId || null,
          relatedProductName: relatedProd ? relatedProd.name : initialProductName || null,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch task");

      setFeedback({ type: "success", text: "Instruction sent to Shopfloor Manager!" });
      setTitle("");
      setDescription("");
      setSelectedProductId("");
      setNotes("");
      setIsComposing(false);
      fetchTasks();
      if (onTasksUpdated) onTasksUpdated();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: "in_progress" | "completed") => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });

      if (res.ok) {
        fetchTasks();
        if (onTasksUpdated) onTasksUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) => {
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const pendingCount = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8 text-slate-900 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Shopfloor Direct Work Orders & Messaging</h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100">
                {isAdmin
                  ? "Dispatch real-time instructions, restock orders & shelf audits to Manager"
                  : "Active work instructions from Store Administrator"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`m-4 p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {feedback.text}
          </div>
        )}

        {/* Action Controls & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
            >
              <option value="all">All Statuses ({tasks.length})</option>
              <option value="pending">Pending Only</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔴 Urgent Only</option>
              <option value="normal">🟡 Normal</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTasks}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsComposing(!isComposing)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isComposing
                    ? "bg-slate-200 text-slate-800"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                }`}
              >
                {isComposing ? (
                  "View List"
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    + New Dispatch Work Order
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Admin Message Compose Form */}
          {isComposing && isAdmin ? (
            <form onSubmit={handleCreateTask} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Send className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Compose Dispatch Work Order to Shopfloor Manager
                </h4>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Task / Message Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Urgent: Order 40 bags of Basmati Rice from Gujarat Agro Mills"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    <option value="urgent">🔴 Urgent / High Priority</option>
                    <option value="normal">🟡 Normal Routine</option>
                    <option value="low">🟢 Low Priority / When Free</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    <option value="stock_order">Stock Reorder / Purchase</option>
                    <option value="shelf_audit">Physical Shelf Audit / Count</option>
                    <option value="customer_order">Customer Packing & Dispatch</option>
                    <option value="general_work">General Store Floor Duty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link Product (optional)</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    <option value="">-- No specific item --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.stock_quantity} left)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instructions / Detailed Notes</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any supplier contact numbers, packaging requirements, dock location, or invoice reference..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? "Sending..." : "Dispatch to Manager"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading instructions...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No active instructions matching filter</p>
                  <p className="text-[11px] text-slate-400">All tasks are up to date and completed.</p>
                </div>
              ) : (
                filteredTasks.map((t) => {
                  const isCompleted = t.status === "completed";
                  const isUrgent = t.priority === "urgent";

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-3xl border transition space-y-3 ${
                        isCompleted
                          ? "bg-slate-50 border-slate-200 opacity-75"
                          : isUrgent
                          ? "bg-red-50/40 border-red-200 shadow-xs"
                          : "bg-white border-slate-200 shadow-xs hover:shadow-md"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              t.priority === "urgent"
                                ? "bg-red-100 text-red-700 border border-red-300 animate-pulse"
                                : t.priority === "normal"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {t.priority} Priority
                          </span>

                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                            {t.category.replace("_", " ")}
                          </span>

                          <span className="text-[11px] text-slate-400 font-medium">
                            From: <strong className="text-slate-700">{t.from_user_name}</strong> • {new Date(t.created_at).toLocaleString()}
                          </span>
                        </div>

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-auto ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : t.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                      </div>

                      <div>
                        <h4 className={`text-sm font-bold ${isCompleted ? "text-slate-600 line-through" : "text-slate-900"}`}>
                          {t.title}
                        </h4>
                        {t.description && (
                          <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{t.description}</p>
                        )}
                      </div>

                      {/* Linked Product Badge */}
                      {t.related_product_name && (
                        <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600 shrink-0" />
                            <div>
                              <span className="text-[10px] font-bold uppercase text-blue-700 block">Target Product</span>
                              <span className="font-bold text-slate-800">{t.related_product_name}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {t.related_product_id && onNavigateToStockAdjust && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onNavigateToStockAdjust(t.related_product_id!);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white border border-blue-300 text-blue-700 rounded-xl text-[11px] font-bold transition shadow-2xs"
                              >
                                Stock In / Out
                              </button>
                            )}

                            {onNavigateToPO && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onNavigateToPO();
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition shadow-2xs"
                              >
                                Raise PO
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-500">
                          {isCompleted ? (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed by {t.completed_by_name || "Manager"} ({t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "done"})
                            </span>
                          ) : (
                            <span>Assigned to: Shopfloor Inventory Manager</span>
                          )}
                        </div>

                        {!isCompleted && (
                          <div className="flex items-center gap-2">
                            {t.status === "pending" && (
                              <button
                                onClick={() => handleUpdateStatus(t.id, "in_progress")}
                                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition"
                              >
                                Start Work
                              </button>
                            )}

                            <button
                              onClick={() => handleUpdateStatus(t.id, "completed")}
                              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Completed
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">
            Direct real-time store communication between Admin & Floor Staff
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
