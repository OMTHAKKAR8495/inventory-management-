"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  Printer,
  CheckCircle2,
  AlertCircle,
  ScanBarcode,
  ArrowRight,
  PackageCheck,
  UserCheck,
  Receipt,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Product, Customer, CartItem, PaymentMethod } from "@/lib/types";

interface BillingCounterViewProps {
  user: any;
  onSaleCompleted?: () => void;
}

export const BillingCounterView: React.FC<BillingCounterViewProps> = ({ user, onSaleCompleted }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Billing Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0); // 0%, 5%, 12%, 18%
  const [notes, setNotes] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Completed Invoice Modal state for printing
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load products & customers
  const loadData = async () => {
    setIsSearching(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch("/api/products?limit=100"),
        fetch("/api/khata"),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData.customers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered product catalog for counter
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Add to cart
  const addToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      setFeedback({ type: "error", text: `"${product.name}" is OUT OF STOCK!` });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          setFeedback({ type: "error", text: `Max available stock for "${product.name}" is ${product.stock_quantity}` });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unit_price: product.selling_price,
            total_price: product.selling_price,
          },
        ];
      }
    });

    setFeedback(null);
  };

  // Update quantity in cart
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const clamped = Math.min(newQty, item.product.stock_quantity);
          return {
            ...item,
            quantity: clamped,
            total_price: clamped * item.unit_price,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerName("Walk-in Customer");
    setCustomerPhone("");
    setDiscountAmount(0);
    setTaxPercent(0);
    setNotes("");
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = Number(((subtotal - discountAmount) * (taxPercent / 100)).toFixed(2));
  const grandTotal = Math.max(0, Number((subtotal - discountAmount + taxAmount).toFixed(2)));

  // Handle Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setFeedback({ type: "error", text: "Cart is empty. Please select products to bill." });
      return;
    }

    if (paymentMethod === "khata" && !selectedCustomer) {
      setFeedback({ type: "error", text: "Please select a registered Khata customer for credit billing." });
      return;
    }

    setIsCheckingOut(true);
    setFeedback(null);

    try {
      const payload = {
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer ? `${selectedCustomer.store_name} (${selectedCustomer.name})` : customerName,
        customerPhone: selectedCustomer?.phone || customerPhone,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        discountAmount,
        taxAmount,
        paymentMethod,
        notes,
      };

      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      setCompletedInvoice({
        ...data.invoice,
        items: [...cart],
        subtotal,
        discountAmount,
        taxAmount,
        taxPercent,
        notes,
      });

      setShowReceiptModal(true);
      clearCart();
      loadData();
      if (onSaleCompleted) onSaleCompleted();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Checkout failed" });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              Live Counter POS
            </span>
            <span className="text-xs text-slate-500 font-medium">Wholesale Fast Checkout & Invoicing</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Shopfloor Quick Billing Counter
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={clearCart}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Cart
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {feedback.text}
        </div>
      )}

      {/* Main Counter Layout: Left Catalog Grid, Right Cart & Checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT (7 Cols): Product Picker & Scanner */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Scan barcode or type product / SKU..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden"
              >
                <option value="all">All Departments ({products.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Item Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_quantity <= 0;
                const inCartQty = cart.find((i) => i.product.id === p.id)?.quantity || 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-3.5 rounded-2xl border transition text-left flex flex-col justify-between select-none relative group ${
                      isOutOfStock
                        ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                        : "bg-white hover:bg-blue-50/40 border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs cursor-pointer"
                    }`}
                  >
                    {inCartQty > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                        {inCartQty}
                      </span>
                    )}

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                        {p.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5 leading-snug">
                        {p.name}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        SKU: {p.sku}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          ₹{p.selling_price.toLocaleString("en-IN")}
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            isOutOfStock
                              ? "text-red-600 font-bold"
                              : p.stock_quantity <= p.reorder_level
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {isOutOfStock ? "Out of Stock" : `${p.stock_quantity} ${p.unit}`}
                        </span>
                      </div>

                      {!isOutOfStock && (
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT (5 Cols): Active Cart & Invoice Generator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Billing Cart ({cart.length} items)</h3>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                ₹{grandTotal.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Customer Selector / Khata Link */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Customer Type:</span>
                <span className="text-[11px] text-blue-600 font-medium">B2B Khata / Retail Walk-in</span>
              </div>

              <select
                value={selectedCustomer?.id || "walk_in"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "walk_in") {
                    setSelectedCustomer(null);
                    setCustomerName("Walk-in Customer");
                    setCustomerPhone("");
                  } else {
                    const cust = customers.find((c) => c.id === val);
                    if (cust) {
                      setSelectedCustomer(cust);
                      setCustomerName(cust.name);
                      setCustomerPhone(cust.phone);
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500"
              >
                <option value="walk_in">Walk-in Cash Retail Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.store_name} — {c.name} (Khata Bal: ₹{c.current_balance.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>

              {!selectedCustomer && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Mobile (optional)"
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Cart is empty</p>
                  <p className="text-[11px] text-slate-400">Click products from the catalog to add items</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h5>
                      <p className="text-[11px] text-slate-500 font-mono">
                        ₹{item.unit_price} × {item.quantity} = ₹{item.total_price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-mono font-bold text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discounts, Tax & Payment Mode */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="₹0"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">GST Tax Slab</label>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={5}>5% GST (Grains / Oil)</option>
                    <option value={12}>12% GST (Packaged Goods)</option>
                    <option value={18}>18% GST (Personal Care)</option>
                  </select>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                      paymentMethod === "cash"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                      paymentMethod === "upi"
                        ? "bg-blue-50 border-blue-400 text-blue-800 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    UPI / QR
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("khata")}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                      paymentMethod === "khata"
                        ? "bg-purple-50 border-purple-400 text-purple-800 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    Khata
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                      paymentMethod === "card"
                        ? "bg-amber-50 border-amber-400 text-amber-800 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    Card
                  </button>
                </div>
              </div>

              {/* Bill Totals Summary Card */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount:</span>
                    <span>- ₹{discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>GST ({taxPercent}%):</span>
                    <span>+ ₹{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900">Total Payable:</span>
                  <span className="text-xl font-black text-blue-700">
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Complete Sale Button */}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut || cart.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-black shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCheckingOut ? (
                  "Processing Sale..."
                ) : (
                  <>
                    <PackageCheck className="w-5 h-5" />
                    Complete Sale & Print Invoice (₹{grandTotal.toLocaleString("en-IN")})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Invoice Printable Modal */}
      {showReceiptModal && completedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8 text-slate-900">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold">Sale Completed Successfully</h3>
                  <p className="text-xs text-blue-200">Invoice #{completedInvoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-white hover:text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div id="printable-receipt" className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h4 className="text-lg font-black tracking-tight text-slate-900">PROVISION SMART</h4>
                <p className="text-xs text-slate-500">Wholesale Goods & General Provision Store</p>
                <p className="text-[11px] text-slate-400">APMC Wholesale Market Yard • GSTIN: 24AAACP1234F1Z5</p>
                <div className="mt-2 text-xs font-mono font-bold text-slate-700">
                  Invoice: #{completedInvoice.invoice_number} • {new Date().toLocaleString()}
                </div>
              </div>

              <div className="text-xs text-slate-700 flex justify-between">
                <div>
                  <span className="text-slate-400">Billed To:</span>{" "}
                  <strong className="text-slate-900">{completedInvoice.customer_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Mode:</span>{" "}
                  <strong className="uppercase text-blue-700">{completedInvoice.payment_method}</strong>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                    <th className="text-left py-1.5">Item</th>
                    <th className="text-center py-1.5">Qty</th>
                    <th className="text-right py-1.5">Rate</th>
                    <th className="text-right py-1.5">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {completedInvoice.items.map((it: any) => (
                    <tr key={it.product.id}>
                      <td className="py-2 pr-2">
                        <div className="font-bold">{it.product.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{it.product.sku}</span>
                      </td>
                      <td className="text-center py-2 font-bold">{it.quantity} {it.product.unit}</td>
                      <td className="text-right py-2">₹{it.unit_price}</td>
                      <td className="text-right py-2 font-bold">₹{it.total_price.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total calculations */}
              <div className="pt-3 border-t border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{completedInvoice.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {completedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount Savings:</span>
                    <span>- ₹{completedInvoice.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {completedInvoice.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>GST:</span>
                    <span>+ ₹{completedInvoice.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-lg text-blue-700">₹{completedInvoice.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[11px] text-slate-400">
                Thank you for shopping with us! Stock automatically updated.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Tax Receipt
              </button>

              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
