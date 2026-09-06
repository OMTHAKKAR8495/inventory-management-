"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, DashboardMetrics, Product } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { DashboardView } from "@/components/DashboardView";
import { InventoryView } from "@/components/InventoryView";
import { BulkUploadStudio } from "@/components/BulkUploadStudio";
import { AuditLogsView } from "@/components/AuditLogsView";
import { BillingCounterView } from "@/components/BillingCounterView";
import { PurchaseOrdersView } from "@/components/PurchaseOrdersView";
import { KhataLedgerView } from "@/components/KhataLedgerView";
import { ProductFormModal } from "@/components/ProductFormModal";
import { StockAdjustModal } from "@/components/StockAdjustModal";
import { UsersModal } from "@/components/UsersModal";
import { RecycleBinModal } from "@/components/RecycleBinModal";
import { BackupModal } from "@/components/BackupModal";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { ShopfloorTasksModal } from "@/components/ShopfloorTasksModal";
import { LoginView } from "@/components/LoginView";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "pos" | "procurement" | "khata" | "bulk" | "audit">("dashboard");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isRecycleBinModalOpen, setIsRecycleBinModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Direct Shopfloor Tasks & Messages
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [taskTargetProductId, setTaskTargetProductId] = useState<string | null>(null);
  const [taskTargetProductName, setTaskTargetProductName] = useState<string | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Live Catalog Version for real-time synchronization across views
  const [catalogVersion, setCatalogVersion] = useState(0);

  // Filter shortcut from dashboard
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<string>("all");

  // Global Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Theme initialization (Always default to crisp professional clean white theme)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("provisionsmart_theme");
    setIsDarkMode(false);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("provisionsmart_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("provisionsmart_theme", "light");
      }
      return next;
    });
  };

  // Inactivity auto-logout (30 minutes of idle time - throttled to eliminate event lag)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    const resetIdleTimer = () => {
      const now = Date.now();
      // Throttle event handling to once every 30 seconds
      if (now - lastActivityRef.current < 30000 && idleTimerRef.current) {
        return;
      }
      lastActivityRef.current = now;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        handleLogout();
        showToast("Session expired due to 30 minutes of inactivity", "error");
      }, 30 * 60 * 1000);
    };

    const activityEvents = ["click", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [user]);

  // Check auth session
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Fetch Pending Tasks count
  const fetchTasksCount = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/tasks?status=pending");
      if (res.ok) {
        const data = await res.json();
        setPendingTasksCount(data.pendingCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Dashboard Metrics
  const fetchMetrics = async () => {
    if (!user) return;
    setIsMetricsLoading(true);
    try {
      const res = await fetch("/api/dashboard/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Failed to load metrics:", err);
    } finally {
      setIsMetricsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMetrics();
      fetchTasksCount();
    }
  }, [user, activeTab]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    setUser(null);
    showToast("Logged out successfully");
  };

  const handleQuickRoleSwitch = async (targetRole: "admin" | "manager") => {
    const creds =
      targetRole === "admin"
        ? { email: "admin@provision.store", password: "admin123" }
        : { email: "manager@provision.store", password: "manager123" };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        showToast(`Switched view to ${data.user.role === "admin" ? "Store Administrator" : "Inventory Manager"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save product (create or update)
  const handleSaveProduct = async (productData: any): Promise<boolean> => {
    try {
      const isEditing = !!editingProduct;
      const url = isEditing ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product");

      showToast(data.message || (isEditing ? "Product updated" : "Product created"));
      fetchMetrics();
      setCatalogVersion((v) => v + 1);
      return true;
    } catch (err: any) {
      showToast(err.message || "Failed to save product", "error");
      return false;
    }
  };

  // Adjust stock
  const handleStockAdjustment = async (
    productId: string,
    type: "stock_in" | "stock_out",
    quantity: number,
    reason: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/products/stock-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, type, quantity, reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust stock");

      showToast(data.message || "Stock quantity updated successfully");
      fetchMetrics();
      setCatalogVersion((v) => v + 1);
      return true;
    } catch (err: any) {
      showToast(err.message || "Failed to adjust stock", "error");
      return false;
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Loading ProvisionSmart...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white pb-16">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        onOpenRecycleBinModal={() => setIsRecycleBinModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
        onOpenTasksModal={(pId?: string, pName?: string) => {
          setTaskTargetProductId(pId || null);
          setTaskTargetProductName(pName || null);
          setIsTasksModalOpen(true);
        }}
        pendingTasksCount={pendingTasksCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        metrics={metrics}
        onSwitchRoleQuickDemo={handleQuickRoleSwitch}
        onSelectAlertItem={(id) => {
          setActiveTab("inventory");
        }}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold text-white ${
              toast.type === "success"
                ? "bg-slate-900 border-slate-800 text-emerald-300"
                : "bg-red-950 border-red-800 text-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main View Switcher */}
      <main className="flex-1">
        {activeTab === "dashboard" && (
          <DashboardView
            metrics={metrics}
            user={user}
            isLoading={isMetricsLoading}
            onNavigateToInventory={(status) => {
              if (status) setInventoryStatusFilter(status);
              else setInventoryStatusFilter("all");
              setActiveTab("inventory");
            }}
            onNavigateToBulk={() => setActiveTab("bulk")}
            onNavigateToPOS={() => setActiveTab("pos")}
            onNavigateToPO={() => setActiveTab("procurement")}
            onNavigateToKhata={() => setActiveTab("khata")}
            onOpenTasksModal={(pId?: string, pName?: string) => {
              setTaskTargetProductId(pId || null);
              setTaskTargetProductName(pName || null);
              setIsTasksModalOpen(true);
            }}
            onQuickStockAdjust={async (productId) => {
              try {
                const res = await fetch(`/api/products/${productId}`);
                const data = await res.json();
                if (data.product) {
                  setAdjustingProduct(data.product);
                  setIsStockAdjustModalOpen(true);
                }
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}

        {activeTab === "inventory" && (
          <InventoryView
            user={user}
            initialFilterStatus={inventoryStatusFilter}
            onOpenAddModal={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            onOpenEditModal={(product) => {
              setEditingProduct(product);
              setIsProductModalOpen(true);
            }}
            onOpenStockAdjustModal={(product) => {
              setAdjustingProduct(product);
              setIsStockAdjustModalOpen(true);
            }}
            onOpenBulkUpload={() => setActiveTab("bulk")}
            onOpenTasksModal={(pId?: string, pName?: string) => {
              setTaskTargetProductId(pId || null);
              setTaskTargetProductName(pName || null);
              setIsTasksModalOpen(true);
            }}
          />
        )}

        {activeTab === "pos" && (
          <BillingCounterView
            user={user}
            catalogVersion={catalogVersion}
            onSaleCompleted={() => {
              fetchMetrics();
              setCatalogVersion((v) => v + 1);
              showToast("Sale completed & stock updated in real time!");
            }}
          />
        )}

        {activeTab === "procurement" && (
          <PurchaseOrdersView
            user={user}
            onRestocked={() => {
              fetchMetrics();
              setCatalogVersion((v) => v + 1);
              showToast("Inward goods received and inventory catalog restocked!");
            }}
          />
        )}

        {activeTab === "khata" && (
          user.role === "admin" ? (
            <KhataLedgerView user={user} />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto font-black text-lg">
                ₹
              </div>
              <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
              <p className="text-xs text-slate-500">
                Customer credit and Khata Ledgers are restricted to Store Administrator access.
              </p>
            </div>
          )
        )}

        {activeTab === "bulk" && (
          <BulkUploadStudio
            user={user}
            existingCategories={metrics?.category_breakdown.map((c) => c.category) || []}
            onSuccessNavigateToInventory={() => {
              setActiveTab("inventory");
              fetchMetrics();
              setCatalogVersion((v) => v + 1);
            }}
          />
        )}

        {activeTab === "audit" && <AuditLogsView />}
      </main>

      {/* Single Product Add / Edit Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
        onSave={handleSaveProduct}
        user={user}
        existingCategories={metrics?.category_breakdown.map((c) => c.category) || []}
        existingSuppliers={[]}
      />

      {/* Quick Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={isStockAdjustModalOpen}
        onClose={() => {
          setIsStockAdjustModalOpen(false);
          setAdjustingProduct(null);
        }}
        product={adjustingProduct}
        onAdjust={handleStockAdjustment}
      />

      {/* Users / Staff Management Modal (Admin Only) */}
      <UsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
      />

      {/* Recycle Bin / Soft-Deleted Items Modal (Admin Only) */}
      <RecycleBinModal
        isOpen={isRecycleBinModalOpen}
        onClose={() => setIsRecycleBinModalOpen(false)}
        onRestored={() => {
          fetchMetrics();
          showToast("Catalog & metrics updated from recycle bin");
        }}
      />

      {/* Database Snapshots & Backups Modal (Admin Only) */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* Barcode / SKU Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onProductFound={(product) => {
          setAdjustingProduct(product);
          setIsStockAdjustModalOpen(true);
        }}
      />

      {/* Shopfloor Direct Tasks & Admin Dispatch Messaging Modal */}
      <ShopfloorTasksModal
        isOpen={isTasksModalOpen}
        onClose={() => {
          setIsTasksModalOpen(false);
          setTaskTargetProductId(null);
          setTaskTargetProductName(null);
        }}
        user={user}
        initialProductId={taskTargetProductId}
        initialProductName={taskTargetProductName}
        onNavigateToStockAdjust={async (productId) => {
          try {
            const res = await fetch(`/api/products/${productId}`);
            const data = await res.json();
            if (data.product) {
              setAdjustingProduct(data.product);
              setIsStockAdjustModalOpen(true);
            }
          } catch (e) {
            console.error(e);
          }
        }}
        onNavigateToPO={() => {
          setActiveTab("procurement");
        }}
        onTasksUpdated={() => {
          fetchTasksCount();
        }}
      />
    </div>
  );
}

