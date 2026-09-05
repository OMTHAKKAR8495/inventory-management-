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
} from "lucide-react";
import { User, DashboardMetrics } from "@/lib/types";

interface NavbarProps {
  user: User;
  activeTab: "dashboard" | "inventory" | "bulk" | "audit";
  setActiveTab: (tab: "dashboard" | "inventory" | "bulk" | "audit") => void;
  onLogout: () => void;
  onOpenUsersModal?: () => void;
  onOpenRecycleBinModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenBarcodeScanner?: () => void;
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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  PROVISION<span className="text-blue-600 dark:text-blue-400">SMART</span>
                </h1>
                <span
                  className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                      : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {isAdmin ? "Admin Portal" : "Inventory Staff"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Wholesale Goods & Provision Inventory (₹)</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "inventory"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50"
              }`}
            >
              <Boxes className="w-4 h-4" />
              Stock Catalog
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "bulk"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Bulk Add & Upload
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "audit"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50"
              }`}
            >
              <History className="w-4 h-4" />
              Movement Logs
            </button>
          </nav>

          {/* Right Controls: Barcode, Dark Mode, Notifications, User, Quick Switch */}
          <div className="flex items-center gap-2">
            {/* Barcode Scanner Shortcut */}
            {onOpenBarcodeScanner && (
              <button
                onClick={onOpenBarcodeScanner}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Open Barcode Scanner"
              >
                <ScanBarcode className="w-5 h-5" />
              </button>
            )}

            {/* Dark Mode Toggle */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            {/* Quick Demo Switcher */}
            {onSwitchRoleQuickDemo && (
              <div className="hidden lg:flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 px-2 py-1 rounded-lg">
                <span className="text-[10px] font-medium text-amber-900 dark:text-amber-300">Demo Role:</span>
                <button
                  onClick={() => onSwitchRoleQuickDemo("admin")}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                    isAdmin ? "bg-amber-600 text-white font-bold" : "text-amber-800 dark:text-amber-400 hover:bg-amber-100"
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => onSwitchRoleQuickDemo("manager")}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                    !isAdmin ? "bg-emerald-600 text-white font-bold" : "text-amber-800 dark:text-amber-400 hover:bg-amber-100"
                  }`}
                >
                  Manager
                </button>
              </div>
            )}

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-hidden"
                title="Stock Alerts"
              >
                <Bell className="w-5 h-5" />
                {criticalCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-fade-in">
                  <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Stock & Expiry Alerts</h4>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
                      {metrics?.critical_alerts.length || 0} urgent
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 py-1">
                    {metrics?.critical_alerts && metrics.critical_alerts.length > 0 ? (
                      metrics.critical_alerts.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveTab("inventory");
                            setShowNotifications(false);
                            if (onSelectAlertItem) onSelectAlertItem(item.id);
                          }}
                          className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{item.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.category} • SKU: {item.sku}</p>
                            {item.expiry_date && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Expires: {item.expiry_date}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === "out_of_stock"
                                  ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                                  : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {item.stock_quantity <= 0 ? "0 in stock" : `${item.stock_quantity} left`}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        All products are currently healthy and well-stocked.
                      </div>
                    )}
                  </div>

                  <div className="px-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setActiveTab("inventory");
                        setShowNotifications(false);
                      }}
                      className="w-full text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center justify-center gap-1 py-1"
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
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                    isAdmin ? "bg-purple-600" : "bg-emerald-600"
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {isAdmin ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
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
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-medium"
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
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between font-medium"
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
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-medium"
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
                    className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center gap-2 font-medium border-t border-slate-100 dark:border-slate-800 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium ${
              activeTab === "dashboard" ? "text-blue-600 font-bold" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium ${
              activeTab === "inventory" ? "text-blue-600 font-bold" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Boxes className="w-4 h-4" />
            Catalog
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium ${
              activeTab === "bulk" ? "text-blue-600 font-bold" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Add
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium ${
              activeTab === "audit" ? "text-blue-600 font-bold" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <History className="w-4 h-4" />
            Logs
          </button>
        </div>
      </div>
    </header>
  );
};
