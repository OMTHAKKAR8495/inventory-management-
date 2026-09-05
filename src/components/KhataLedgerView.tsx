"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  UserPlus,
  IndianRupee,
  Phone,
  Store,
  CreditCard,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  MessageSquare,
  History,
  Calendar,
  Eye,
} from "lucide-react";
import { Customer, KhataTransaction, User } from "@/lib/types";

interface KhataLedgerViewProps {
  user: User;
}

export const KhataLedgerView: React.FC<KhataLedgerViewProps> = ({ user }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalReceivable, setTotalReceivable] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Customer Detail Modal state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerData, setSelectedCustomerData] = useState<{
    customer: Customer;
    transactions: KhataTransaction[];
    invoices: any[];
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // New Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustStore, setNewCustStore] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustLimit, setNewCustLimit] = useState<number>(50000);
  const [newCustInitialBal, setNewCustInitialBal] = useState<number>(0);

  // Payment Recording Modal
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payingCustomerId, setPayingCustomerId] = useState<string>("");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>("UPI / Cash");
  const [payNotes, setPayNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/khata");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotalReceivable(data.totalReceivable || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCustomerDetail = async (custId: string) => {
    setSelectedCustomerId(custId);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/khata?customer_id=${custId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomerData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_customer",
          name: newCustName,
          storeName: newCustStore,
          phone: newCustPhone,
          address: newCustAddress,
          creditLimit: newCustLimit,
          initialBalance: newCustInitialBal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      setMessage({ type: "success", text: data.message });
      setIsAddCustomerOpen(false);
      setNewCustName("");
      setNewCustStore("");
      setNewCustPhone("");
      setNewCustAddress("");
      setNewCustInitialBal(0);
      fetchCustomers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_payment",
          customerId: payingCustomerId,
          amount: payAmount,
          paymentMode: payMode,
          notes: payNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      setMessage({ type: "success", text: data.message });
      setIsRecordPaymentOpen(false);
      setPayAmount(0);
      setPayNotes("");
      fetchCustomers();
      if (selectedCustomerId) {
        openCustomerDetail(selectedCustomerId);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.store_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              B2B Trade Credit Ledger
            </span>
            <span className="text-xs text-slate-500 font-medium">Customer Udhar & Payment Settlements</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
            Customer Khata & Credit Directory
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setPayingCustomerId(customers[0]?.id || "");
              setIsRecordPaymentOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment Received
          </button>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Register New Customer
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-purple-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Market Receivables</span>
          <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-1">
            ₹{totalReceivable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Outstanding Khata credit given to retail stores</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Accounts</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {customers.length} Shops
          </div>
          <p className="text-xs text-slate-500 mt-1">Active retail dukaan-walas & buyers</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Zero Balance Accounts</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
            {customers.filter((c) => c.current_balance <= 0).length} Clean
          </div>
          <p className="text-xs text-slate-500 mt-1">Customers with zero pending dues</p>
        </div>
      </div>

      {/* Search & Customer Grid */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer by shop name, contact person, or phone number..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-hidden focus:border-purple-500"
          />
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No customers found matching search.</div>
          ) : (
            filteredCustomers.map((c) => {
              const hasDue = c.current_balance > 0;
              const waMessage = encodeURIComponent(
                `Namaste ${c.name} (${c.store_name}), your current pending balance at ProvisionSmart Wholesale Store is ₹${c.current_balance.toLocaleString("en-IN")}. Please settle via UPI / Cash at your earliest convenience. Thank you!`
              );
              const waUrl = `https://wa.me/${c.phone.replace(/[^0-9]/g, "")}?text=${waMessage}`;

              return (
                <div
                  key={c.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-purple-600" />
                      <h4 className="text-sm font-bold text-slate-900">{c.store_name}</h4>
                      <span className="text-xs text-slate-500 font-medium">({c.name})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                      <span>•</span>
                      <span>Credit Limit: ₹{c.credit_limit.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Outstanding Dues
                      </span>
                      <span
                        className={`text-base font-black ${
                          hasDue ? "text-purple-700 font-mono" : "text-emerald-700"
                        }`}
                      >
                        ₹{c.current_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasDue && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          title="Send WhatsApp Payment Reminder"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Remind
                        </a>
                      )}

                      <button
                        onClick={() => {
                          setPayingCustomerId(c.id);
                          setPayAmount(c.current_balance > 0 ? c.current_balance : 0);
                          setIsRecordPaymentOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                      >
                        + Payment
                      </button>

                      <button
                        onClick={() => openCustomerDetail(c.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        Ledger
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Ledger Detail Modal */}
      {selectedCustomerId && selectedCustomerData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8 text-slate-900">
            <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{selectedCustomerData.customer.store_name}</h3>
                <p className="text-xs text-purple-200">
                  {selectedCustomerData.customer.name} • {selectedCustomerData.customer.phone}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setSelectedCustomerData(null);
                }}
                className="text-white hover:text-purple-200 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-800 uppercase">Current Pending Balance:</span>
                  <div className="text-2xl font-black text-purple-900">
                    ₹{selectedCustomerData.customer.current_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPayingCustomerId(selectedCustomerData.customer.id);
                    setPayAmount(selectedCustomerData.customer.current_balance);
                    setIsRecordPaymentOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Record Payment
                </button>
              </div>

              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Khata Transaction Ledger ({selectedCustomerData.transactions.length})
              </h4>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                {selectedCustomerData.transactions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No transactions recorded yet.</div>
                ) : (
                  selectedCustomerData.transactions.map((tx) => {
                    const isDebit = tx.type === "debit_purchase";

                    return (
                      <div key={tx.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              isDebit ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{tx.notes || (isDebit ? "Credit Purchase" : "Payment Received")}</p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(tx.created_at).toLocaleString()} • Logged by {tx.created_by_name}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-black text-sm ${
                              isDebit ? "text-purple-700" : "text-emerald-700"
                            }`}
                          >
                            {isDebit ? `+ ₹${tx.amount.toLocaleString("en-IN")}` : `- ₹${tx.amount.toLocaleString("en-IN")}`}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Balance: ₹{tx.new_balance.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in text-slate-900">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Record Khata Payment Received</h3>
              <button onClick={() => setIsRecordPaymentOpen(false)} className="text-white hover:text-slate-200 text-xs font-bold">
                Close
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer</label>
                <select
                  value={payingCustomerId}
                  onChange={(e) => setPayingCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-emerald-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.store_name} — Due: ₹{c.current_balance.toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount || ""}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black font-mono text-slate-900 outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                >
                  <option value="UPI / PhonePe / GPay">UPI / PhonePe / GPay</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank NEFT / RTGS">Bank NEFT / RTGS</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Notes / Reference</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. UTR #88921 or Partial settlement"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Recording..." : "Save Payment & Settle Balance"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in text-slate-900">
            <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Register Customer for Khata</h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="text-white hover:text-slate-200 text-xs font-bold">
                Close
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shop / Business Name</label>
                <input
                  type="text"
                  required
                  value={newCustStore}
                  onChange={(e) => setNewCustStore(e.target.value)}
                  placeholder="e.g. Balaji Kirana Stores"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Owner / Contact Name</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rajesh Bhai"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone (WhatsApp enabled)</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+91 98250 12345"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCustLimit}
                    onChange={(e) => setNewCustLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Opening Dues (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCustInitialBal}
                    onChange={(e) => setNewCustInitialBal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shop Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Shop 12, Market Yard"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Registering..." : "Save Customer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
