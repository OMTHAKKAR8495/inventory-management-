"use client";

import React, { useState } from "react";
import {
  Store,
  LayoutDashboard,
  Boxes,
  FileSpreadsheet,
  History,
  Users,
  LogOut,
  Bell,
  ChevronDown,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  ScanBarcode,
  Trash2,
  Database,
  Moon,
  Sun,
  Truck,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { User, DashboardMetrics } from "@/lib/types";

interface NavbarProps {
  user: User;
  activeTab: "dashboard" | "inventory" | "pos" | "procurement" | "khata" | "bulk" | "audit";
  setActiveTab: (tab: "dashboard" | "inventory" | "pos" | "procurement" | "khata" | "bulk" | "audit") => void;
  onLogout: () => void;
  onOpenUsersModal?: () => void;
  onOpenRecycleBinModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenBarcodeScanner?: () => void;
  onOpenTasksModal?: (productId?: string, productName?: string) => void;
  pendingTasksCount?: number;
  metrics?: DashboardMetrics | null;
  onSwitchRoleQuickDemo?: (role: "admin" | "manager") => void;
  onSelectAlertItem?: (productId: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenUsersModal,
  onOpenRecycleBinModal,
  onOpenBackupModal,
  onOpenBarcodeScanner,
  onOpenTasksModal,
  pendingTasksCount = 0,
  metrics,
  onSwitchRoleQuickDemo,
  onSelectAlertItem,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = user.role === "admin";
  const criticalCount = (metrics?.low_stock_count || 0) + (metrics?.out_of_stock_count || 0);
  const trashCount = metrics?.trash_count || 0;

  return (
    <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 leading-tight">
                  PROVISION<span className="text-blue-600">SMART</span>
                </h1>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isAdmin ? "Admin" : "Staff"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">Wholesale Provision System (₹)</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "inventory"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              Catalog
            </button>
            <button
              onClick={() => setActiveTab("pos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "pos"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-blue-700 hover:bg-blue-50 font-bold"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Counter POS
            </button>
            <button
              onClick={() => setActiveTab("procurement")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "procurement"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Supplier POs
            </button>
            <button
              onClick={() => setActiveTab("khata")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "khata"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Khata Ledger
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "bulk"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Bulk Add
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "audit"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Movement Logs
            </button>
          </nav>

          {/* Right Controls: Barcode, Notifications, User, Quick Switch */}
          <div className="flex items-center gap-2">
            {/* Barcode Scanner Shortcut */}
            {onOpenBarcodeScanner && (
              <button
                onClick={onOpenBarcodeScanner}
                className="p-2 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                title="Open Barcode Scanner"
              >
                <ScanBarcode className="w-5 h-5" />
              </button>
            )}

            {/* Quick Demo Switcher */}
            {onSwitchRoleQuickDemo && (
              <div className="hidden lg:flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg">
                <span className="text-[10px] font-medium text-amber-900">Demo Role:</span>
                <button
                  onClick={() => onSwitchRoleQuickDemo("admin")}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                    isAdmin ? "bg-amber-600 text-white font-bold" : "text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => onSwitchRoleQuickDemo("manager")}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                    !isAdmin ? "bg-emerald-600 text-white font-bold" : "text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  Manager
                </button>
              </div>
            )}

            {/* Shopfloor Direct Task & Dispatch Messages */}
            {onOpenTasksModal && (
              <button
                onClick={() => onOpenTasksModal()}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/90 rounded-xl text-xs font-bold transition"
                title={isAdmin ? "Dispatch instructions or order products for floor manager" : "View active tasks from Admin"}
              >
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">
                  {isAdmin ? "Dispatch Tasks" : "Work Orders"}
                </span>
                {pendingTasksCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center animate-pulse">
                    {pendingTasksCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition focus:outline-hidden"
                title="Stock Alerts"
              >
                <Bell className="w-5 h-5" />
                {criticalCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-fade-in">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-sm font-semibold text-slate-900">Stock & Expiry Alerts</h4>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                      {metrics?.critical_alerts.length || 0} urgent
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-1">
                    {metrics?.critical_alerts && metrics.critical_alerts.length > 0 ? (
                      metrics.critical_alerts.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveTab("inventory");
                            setShowNotifications(false);
                            if (onSelectAlertItem) onSelectAlertItem(item.id);
                          }}
                          className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">{item.name}</p>
                            <p className="text-[11px] text-slate-500">{item.category} • SKU: {item.sku}</p>
                            {item.expiry_date && (
                              <p className="text-[10px] text-amber-600 font-medium">Expires: {item.expiry_date}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === "out_of_stock"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {item.stock_quantity <= 0 ? "0 in stock" : `${item.stock_quantity} left`}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">
                        All products are currently healthy and well-stocked.
                      </div>
                    )}
                  </div>

                  <div className="px-4 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveTab("inventory");
                        setShowNotifications(false);
                      }}
                      className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 py-1"
                    >
                      View All Stock in Catalog
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                    isAdmin ? "bg-purple-600" : "bg-emerald-600"
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {isAdmin ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                        {user.role} Permissions
                      </span>
                    </div>
                  </div>

                  {isAdmin && onOpenUsersModal && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenUsersModal();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <Users className="w-4 h-4 text-slate-400" />
                      Staff & User Accounts
                    </button>
                  )}

                  {isAdmin && onOpenRecycleBinModal && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenRecycleBinModal();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-slate-400" />
                        Recycle Bin / Trash
                      </div>
                      {trashCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                          {trashCount}
                        </span>
                      )}
                    </button>
                  )}

                  {isAdmin && onOpenBackupModal && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenBackupModal();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <Database className="w-4 h-4 text-slate-400" />
                      Database Backup Snapshots
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Nav Bar */}
        <div className="flex xl:hidden items-center justify-start py-2 border-t border-slate-100 overflow-x-auto gap-2 scrollbar-none px-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "dashboard" ? "bg-blue-50 text-blue-700 font-bold border border-blue-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "inventory" ? "bg-blue-50 text-blue-700 font-bold border border-blue-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Catalog
          </button>
          <button
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "pos" ? "bg-blue-600 text-white font-bold shadow-xs" : "text-blue-700 bg-blue-50/70 hover:bg-blue-100 font-bold"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Counter POS
          </button>
          <button
            onClick={() => setActiveTab("procurement")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "procurement" ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Supplier POs
          </button>
          <button
            onClick={() => setActiveTab("khata")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "khata" ? "bg-purple-50 text-purple-700 font-bold border border-purple-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Khata
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "bulk" ? "bg-blue-50 text-blue-700 font-bold border border-blue-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Bulk Add
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "audit" ? "bg-blue-50 text-blue-700 font-bold border border-blue-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Logs
          </button>
        </div>
      </div>
    </header>
  );
};
