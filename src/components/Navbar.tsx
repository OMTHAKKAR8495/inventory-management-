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
  BookOpen,
  MessageSquare,
  Receipt,
  FileText,
} from "lucide-react";
import { User, DashboardMetrics } from "@/lib/types";

interface NavbarProps {
  user: User;
  activeTab: "dashboard" | "inventory" | "pos" | "khata" | "bulk" | "audit";
  setActiveTab: (tab: "dashboard" | "inventory" | "pos" | "khata" | "bulk" | "audit") => void;
  onLogout: () => void;
  onOpenUsersModal?: () => void;
  onOpenRecycleBinModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenBarcodeScanner?: () => void;
  onOpenTasksModal?: (productId?: string, productName?: string) => void;
  pendingTasksCount?: number;
  metrics?: DashboardMetrics | null;
  onSelectAlertItem?: (productId: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onNavigateToCounterPOS?: () => void;
  onNavigateToPassedBills?: () => void;
  posViewMode?: "counter" | "saved_bills" | "passed_bills";
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
  onSelectAlertItem,
  isDarkMode = false,
  onToggleDarkMode,
  onNavigateToCounterPOS,
  onNavigateToPassedBills,
  posViewMode = "counter",
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = Boolean(user && typeof user.role === "string" && user.role.toLowerCase().trim() === "admin");
  const criticalCount = (metrics?.low_stock_count || 0) + (metrics?.out_of_stock_count || 0);
  const trashCount = metrics?.trash_count || 0;

  return (
    <header className="sticky top-0 z-40 bg-[#070a12]/90 dark:bg-[#070a12]/95 backdrop-blur-xl border-b border-white/10 shadow-xl transition-colors">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 border border-white/20 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-tight text-white leading-tight">
                  PROVISION<span className="text-blue-400">SMART</span>
                </h1>
                <span
                  className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full border ${
                    isAdmin
                      ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {isAdmin ? "Admin" : "Staff"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden 2xl:block font-medium">Wholesale Provision System (₹)</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1 bg-slate-900/60 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-inner min-w-0 max-w-fit shrink">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-1 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "inventory"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              Catalog
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    if (onNavigateToCounterPOS) {
                      onNavigateToCounterPOS();
                    } else {
                      setActiveTab("pos");
                    }
                  }}
                  className={`flex items-center gap-1 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "pos" && posViewMode !== "passed_bills"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-emerald-400 hover:bg-emerald-500/15 font-bold"
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span><span className="hidden 2xl:inline">Counter </span>POS</span>
                </button>
                <button
                  onClick={() => {
                    if (onNavigateToPassedBills) {
                      onNavigateToPassedBills();
                    } else {
                      setActiveTab("pos");
                    }
                  }}
                  className={`flex items-center gap-1 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "pos" && posViewMode === "passed_bills"
                      ? "bg-teal-600 text-white shadow-md shadow-teal-600/30 font-bold"
                      : "text-teal-300 hover:text-white hover:bg-teal-500/15 font-bold"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-teal-400" />
                  <span>Passed<span className="hidden 2xl:inline"> Bills</span></span>
                  {(metrics?.passed_bills_count ?? 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                      {metrics?.passed_bills_count}
                    </span>
                  )}
                </button>
              </>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("khata")}
                className={`flex items-center gap-1 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "khata"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Khata<span className="hidden 2xl:inline"> Ledger</span></span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("bulk")}
              className={`flex items-center gap-1 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "bulk"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Bulk Add
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-1 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "audit"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span><span className="hidden 2xl:inline">Movement </span>Logs</span>
            </button>
          </nav>

          {/* Right Controls: Barcode, Tasks, Notifications, Dark Mode, User */}
          <div className="flex items-center gap-1 sm:gap-1.5 2xl:gap-2 shrink-0">
            {/* Barcode Scanner Shortcut */}
            {onOpenBarcodeScanner && (
              <button
                onClick={onOpenBarcodeScanner}
                className="p-1.5 sm:p-2 text-slate-300 hover:text-blue-400 rounded-xl hover:bg-white/10 transition border border-transparent hover:border-white/10 cursor-pointer"
                title="Open Barcode Scanner"
              >
                <ScanBarcode className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}


            {/* Shopfloor Direct Task & Dispatch Messages */}
            {onOpenTasksModal && (
              <button
                onClick={() => onOpenTasksModal()}
                className="relative flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title={isAdmin ? "Dispatch instructions or order products for floor manager" : "View active tasks from Admin"}
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                <span className="hidden md:inline">
                  {isAdmin ? "Dispatch" : "Tasks"}
                </span>
                {pendingTasksCount > 0 && (
                  <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
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
                className="relative p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition border border-transparent hover:border-white/10 focus:outline-hidden"
                title="Stock Alerts"
              >
                <Bell className="w-5 h-5" />
                {criticalCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-slate-950 animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-[#0c1222]/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 py-3 z-50 animate-fade-in text-slate-100">
                  <div className="px-4 pb-2 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-semibold text-white">Stock & Expiry Alerts</h4>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      {metrics?.critical_alerts.length || 0} urgent
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-white/5 py-1">
                    {metrics?.critical_alerts && metrics.critical_alerts.length > 0 ? (
                      metrics.critical_alerts.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveTab("inventory");
                            setShowNotifications(false);
                            if (onSelectAlertItem) onSelectAlertItem(item.id);
                          }}
                          className="px-4 py-2.5 hover:bg-white/5 cursor-pointer transition flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-100 line-clamp-1">{item.name}</p>
                            <p className="text-[11px] text-slate-400">{item.category} • SKU: {item.sku}</p>
                            {item.expiry_date && (
                              <p className="text-[10px] text-amber-400 font-medium">Expires: {item.expiry_date}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === "out_of_stock"
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {item.stock_quantity <= 0 ? "0 in stock" : `${item.stock_quantity} left`}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-slate-400">
                        All products are currently healthy and well-stocked.
                      </div>
                    )}
                  </div>

                  <div className="px-4 pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        setActiveTab("inventory");
                        setShowNotifications(false);
                      }}
                      className="w-full text-center text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 py-1"
                    >
                      View All Stock in Catalog
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Light / Dark Mode Toggle Button */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="p-1.5 sm:p-2 text-slate-300 hover:text-amber-300 rounded-xl hover:bg-white/10 transition border border-white/10 hover:border-white/20 flex items-center justify-center cursor-pointer shadow-sm shrink-0"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle Theme"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
                ) : (
                  <Moon className="w-4 h-4 text-sky-300" />
                )}
              </button>
            )}

            {/* User Profile & Menu */}
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-white/10 transition border border-transparent hover:border-white/10 cursor-pointer"
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0 ${
                    isAdmin ? "bg-purple-600" : "bg-emerald-600"
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden 2xl:block">
                  <p className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[90px]">{user.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-[#0c1222]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 py-2 z-50 animate-fade-in text-slate-100">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {isAdmin ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-300">
                        {user.role} Permissions
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setActiveTab("pos");
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium"
                    >
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      Passed Bills & Invoice Archive
                    </button>
                  )}

                  {isAdmin && onOpenUsersModal && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenUsersModal();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium"
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
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-between font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-slate-400" />
                        Recycle Bin / Trash
                      </div>
                      {trashCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded-full">
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
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium"
                    >
                      <Database className="w-4 h-4 text-slate-400" />
                      Database Backup Snapshots
                    </button>
                  )}

                  {onToggleDarkMode && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onToggleDarkMode();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-between font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-300" />}
                        <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {isDarkMode ? "Dark" : "Light"}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 font-medium border-t border-white/10 mt-1"
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
        <div className="flex xl:hidden items-center justify-start py-2 border-t border-white/10 overflow-x-auto gap-2 scrollbar-none px-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "dashboard" ? "bg-blue-600 text-white font-bold" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "inventory" ? "bg-blue-600 text-white font-bold" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Catalog
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  if (onNavigateToCounterPOS) {
                    onNavigateToCounterPOS();
                  } else {
                    setActiveTab("pos");
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                  activeTab === "pos" && posViewMode !== "passed_bills"
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 font-bold"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Counter POS
              </button>
              <button
                onClick={() => {
                  if (onNavigateToPassedBills) {
                    onNavigateToPassedBills();
                  } else {
                    setActiveTab("pos");
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                  activeTab === "pos" && posViewMode === "passed_bills"
                    ? "bg-teal-600 text-white font-bold"
                    : "text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 font-bold"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Passed Bills</span>
                {(metrics?.passed_bills_count ?? 0) > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                    {metrics?.passed_bills_count}
                  </span>
                )}
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab("khata")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                activeTab === "khata" ? "bg-purple-600 text-white font-bold" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Khata
            </button>
          )}
          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "bulk" ? "bg-blue-600 text-white font-bold" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Bulk Add
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              activeTab === "audit" ? "bg-blue-600 text-white font-bold" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Logs
          </button>

          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-300" />}
              <span>{isDarkMode ? "Light" : "Dark"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
