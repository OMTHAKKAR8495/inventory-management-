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
  PackageCheck,
  Receipt,
  RotateCcw,
  MessageSquare,
  FileDown,
  RotateCw,
  Bookmark,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  Calendar,
  Wallet,
  FileText,
  Eye,
  Download,
  Layers,
  X,
  Pencil,
} from "lucide-react";
import { Product, Customer, CartItem, PaymentMethod, SavedBill } from "@/lib/types";
import { generateInvoicePDF } from "@/lib/exportUtils";

interface BillingCounterViewProps {
  user: any;
  catalogVersion?: number;
  onSaleCompleted?: () => void;
  initialViewMode?: "counter" | "saved_bills" | "passed_bills";
  onViewModeChanged?: (mode: "counter" | "saved_bills" | "passed_bills") => void;
}

export const BillingCounterView: React.FC<BillingCounterViewProps> = ({
  user,
  catalogVersion = 0,
  onSaleCompleted,
  initialViewMode = "counter",
  onViewModeChanged,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // View Mode: "counter" (Live POS billing) vs "saved_bills" (Held/Draft bills) vs "passed_bills" (Completed Invoices History)
  const [viewMode, setViewModeState] = useState<"counter" | "saved_bills" | "passed_bills">(initialViewMode);

  const setViewMode = (mode: "counter" | "saved_bills" | "passed_bills") => {
    setViewModeState(mode);
    if (onViewModeChanged) {
      onViewModeChanged(mode);
    }
  };

  React.useEffect(() => {
    if (initialViewMode) {
      setViewModeState(initialViewMode);
    }
  }, [initialViewMode]);

  // Saved Bills State & Filters
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [savedBillsSearch, setSavedBillsSearch] = useState("");
  const [savedBillsFilter, setSavedBillsFilter] = useState<"all" | "today" | "high_value" | "khata" | "cash" | "upi">("all");
  const [savedBillsSort, setSavedBillsSort] = useState<"newest" | "oldest" | "amount_high" | "amount_low">("newest");

  // Passed Bills (Completed Invoices History) State & Filters
  const [passedInvoices, setPassedInvoices] = useState<any[]>([]);
  const [isPassedInvoicesLoading, setIsPassedInvoicesLoading] = useState(false);
  const [passedInvoicesSearch, setPassedInvoicesSearch] = useState("");
  const [passedInvoicesFilter, setPassedInvoicesFilter] = useState<"all" | "today" | "yesterday" | "cash" | "upi" | "khata" | "card">("all");
  const [passedInvoicesDate, setPassedInvoicesDate] = useState<string>("");
  const [passedInvoicesStartDate, setPassedInvoicesStartDate] = useState<string>("");
  const [passedInvoicesEndDate, setPassedInvoicesEndDate] = useState<string>("");
  const [showDateRangeFilter, setShowDateRangeFilter] = useState<boolean>(false);

  // Edit Passed Bill & Payment Mode Modal State
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"cash" | "upi" | "khata" | "card">("cash");
  const [editPaymentStatus, setEditPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingInvoiceEdit, setIsSavingInvoiceEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Load saved bills from localStorage on initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("provisionsmart_saved_bills");
        if (raw) {
          setSavedBills(JSON.parse(raw));
        }
      } catch (e) {
        console.error("Failed to load saved bills:", e);
      }
    }
  }, []);

  const persistSavedBills = (bills: SavedBill[]) => {
    setSavedBills(bills);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("provisionsmart_saved_bills", JSON.stringify(bills));
      } catch (e) {
        console.error("Failed to persist saved bills:", e);
      }
    }
  };

  // Load Passed Invoices History from real database
  const loadPassedInvoices = async () => {
    setIsPassedInvoicesLoading(true);
    try {
      const res = await fetch("/api/pos/invoices?limit=100");
      if (res.ok) {
        const data = await res.json();
        setPassedInvoices(data.invoices || []);
      }
    } catch (e) {
      console.error("Failed to load passed invoices:", e);
    } finally {
      setIsPassedInvoicesLoading(false);
    }
  };

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

  // WhatsApp Reminder Modal State for Saved Bills
  const [whatsappModalBill, setWhatsappModalBill] = useState<SavedBill | null>(null);
  const [whatsappTargetPhone, setWhatsappTargetPhone] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close modals or clear search on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showReceiptModal) {
          setShowReceiptModal(false);
          setCompletedInvoice(null);
        } else if (whatsappModalBill) {
          setWhatsappModalBill(null);
        } else if (searchTerm) {
          setSearchTerm("");
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showReceiptModal, whatsappModalBill, searchTerm]);

  // Load products & customers from the real database API (Single Source of Truth)
  const loadData = async () => {
    setIsSearching(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch("/api/products?limit=200"),
        fetch("/api/khata"),
      ]);
      loadPassedInvoices();

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const prodList: Product[] = prodData.products || [];
        setProducts(prodList);

        // Reconcile active cart against fresh live stock
        setCart((prevCart) => {
          if (prevCart.length === 0) return prevCart;
          const reconciledCart: CartItem[] = [];
          for (const item of prevCart) {
            const liveProd = prodList.find((p) => p.id === item.product.id);
            if (!liveProd || liveProd.stock_quantity <= 0) {
              setFeedback({
                type: "error",
                text: `"${item.product.name}" is now OUT OF STOCK (0 available) and was removed from your cart.`,
              });
            } else {
              const clampedQty = Math.min(item.quantity, liveProd.stock_quantity);
              if (clampedQty < item.quantity) {
                setFeedback({
                  type: "error",
                  text: `Available stock for "${liveProd.name}" reduced to ${liveProd.stock_quantity} ${liveProd.unit}. Cart quantity was adjusted.`,
                });
              }
              reconciledCart.push({
                ...item,
                product: liveProd,
                quantity: clampedQty,
                unit_price: liveProd.selling_price,
                total_price: clampedQty * liveProd.selling_price,
              });
            }
          }
          return reconciledCart;
        });
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData.customers || []);
      }
    } catch (e) {
      console.error("Failed to load POS data:", e);
    } finally {
      setIsSearching(false);
    }
  };

  // Automatically refresh products when stock is adjusted anywhere or when catalogVersion increments
  useEffect(() => {
    loadData();
  }, [catalogVersion]);

  // Calculate held / booked stock quantities across all active Saved Bills
  const heldStockMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const bill of savedBills) {
      for (const item of bill.cart) {
        map[item.product.id] = (map[item.product.id] || 0) + item.quantity;
      }
    }
    return map;
  }, [savedBills]);

  // Filtered product catalog for counter
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm));
      const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, selectedCategory]);

  const categories = React.useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Add to cart with strict real-time stock boundary enforcement (accounting for held bookings)
  const addToCart = (product: Product) => {
    const currentLiveProd = products.find((p) => p.id === product.id) || product;
    const heldQty = heldStockMap[product.id] || 0;
    const availableStock = Math.max(0, currentLiveProd.stock_quantity - heldQty);

    if (availableStock <= 0) {
      setFeedback({
        type: "error",
        text: heldQty > 0
          ? `Cannot add "${product.name}" — all ${currentLiveProd.stock_quantity} ${product.unit} are currently BOOKED in Saved Bills.`
          : `Cannot add "${product.name}" — product is OUT OF STOCK (0 ${product.unit} available).`,
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          setFeedback({
            type: "error",
            text: `Cannot add more. Maximum available stock for "${product.name}" is ${availableStock} ${product.unit}${heldQty > 0 ? ` (${heldQty} held in Saved Bills)` : ""}.`,
          });
          return prev; // Block increment
        }
        setFeedback(null);
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                product: currentLiveProd,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * currentLiveProd.selling_price,
              }
            : item
        );
      } else {
        setFeedback(null);
        return [
          ...prev,
          {
            product: currentLiveProd,
            quantity: 1,
            unit_price: currentLiveProd.selling_price,
            total_price: currentLiveProd.selling_price,
          },
        ];
      }
    });
  };

  // Update quantity in cart with strict bounds checking
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const currentLiveProd = products.find((p) => p.id === productId);
    const heldQty = heldStockMap[productId] || 0;
    const maxStock = currentLiveProd
      ? Math.max(0, currentLiveProd.stock_quantity - heldQty)
      : 999999;

    if (newQty > maxStock) {
      setFeedback({
        type: "error",
        text: `Requested quantity (${newQty}) exceeds available stock of ${maxStock} ${currentLiveProd?.unit || "units"}${heldQty > 0 ? ` (${heldQty} held in Saved Bills)` : ""}. Adjusted to maximum available.`,
      });
      newQty = maxStock;
    } else {
      setFeedback(null);
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const clamped = Math.min(newQty, maxStock);
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

  // Calculations derived strictly from valid cart items
  const validCartItems = cart.filter((item) => item.quantity > 0 && item.product.stock_quantity > 0);
  const subtotal = validCartItems.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = Number(((subtotal - discountAmount) * (taxPercent / 100)).toFixed(2));
  const grandTotal = Math.max(0, Number((subtotal - discountAmount + taxAmount).toFixed(2)));

  // Handle Save Current Bill as Draft / Hold
  const handleSaveCurrentBill = () => {
    if (cart.length === 0) {
      setFeedback({ type: "error", text: "Cannot save an empty cart. Please add products first." });
      return;
    }

    const billNumber = "HOLD-" + Date.now().toString().slice(-5);
    const newSavedBill: SavedBill = {
      id: "saved_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      billNumber,
      customer: selectedCustomer,
      customerName: selectedCustomer ? `${selectedCustomer.store_name} (${selectedCustomer.name})` : customerName,
      customerPhone: selectedCustomer?.phone || customerPhone,
      cart: [...cart],
      discountAmount,
      taxPercent,
      taxAmount,
      subtotal,
      grandTotal,
      paymentMethod,
      notes,
      savedAt: new Date().toISOString(),
    };

    const updated = [newSavedBill, ...savedBills];
    persistSavedBills(updated);
    clearCart();
    setFeedback({
      type: "success",
      text: `Draft Bill #${billNumber} for ₹${grandTotal.toLocaleString("en-IN")} saved to Saved Bills!`,
    });
  };

  // Handle Load / Resume Saved Bill into Cart
  const handleLoadSavedBill = (bill: SavedBill) => {
    if (cart.length > 0) {
      const confirmReplace = window.confirm(
        "Your active cart already has items. Replace active cart with this saved bill?"
      );
      if (!confirmReplace) return;
    }

    // Reconcile saved bill items against current live inventory
    const reconciledCart: CartItem[] = [];
    let hasAdjustments = false;

    for (const item of bill.cart) {
      const liveProd = products.find((p) => p.id === item.product.id);
      if (!liveProd || liveProd.stock_quantity <= 0) {
        hasAdjustments = true;
      } else {
        const clampedQty = Math.min(item.quantity, liveProd.stock_quantity);
        if (clampedQty < item.quantity) hasAdjustments = true;
        reconciledCart.push({
          ...item,
          product: liveProd,
          quantity: clampedQty,
          unit_price: liveProd.selling_price,
          total_price: clampedQty * liveProd.selling_price,
        });
      }
    }

    setCart(reconciledCart);
    setSelectedCustomer(bill.customer || null);
    setCustomerName(bill.customerName || "Walk-in Customer");
    setCustomerPhone(bill.customerPhone || "");
    setDiscountAmount(bill.discountAmount || 0);
    setTaxPercent(bill.taxPercent || 0);
    setPaymentMethod(bill.paymentMethod || "cash");
    setNotes(bill.notes || "");

    // Remove from saved bills list once resumed
    const remaining = savedBills.filter((b) => b.id !== bill.id);
    persistSavedBills(remaining);

    setViewMode("counter");
    setFeedback({
      type: hasAdjustments ? "error" : "success",
      text: hasAdjustments
        ? `Loaded Saved Bill #${bill.billNumber}. Note: Some item quantities were adjusted to match current live stock levels.`
        : `Loaded Saved Bill #${bill.billNumber} into active Billing Cart. Ready to checkout!`,
    });
  };

  // Handle Delete Saved Bill
  const handleDeleteSavedBill = (billId: string) => {
    const target = savedBills.find((b) => b.id === billId);
    if (!target) return;
    if (window.confirm(`Are you sure you want to delete saved draft bill #${target.billNumber}?`)) {
      const updated = savedBills.filter((b) => b.id !== billId);
      persistSavedBills(updated);
      setFeedback({
        type: "success",
        text: `Saved Bill #${target.billNumber} removed.`,
      });
    }
  };

  // Handle Print Draft Estimate for a Saved Bill
  const handlePrintDraftBill = (bill: SavedBill) => {
    try {
      const draftInvoiceData = {
        invoice_number: bill.billNumber,
        customer_name: bill.customerName,
        customer_phone: bill.customerPhone,
        payment_method: `${bill.paymentMethod.toUpperCase()} (ESTIMATE DRAFT)`,
        items: bill.cart,
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        taxAmount: bill.taxAmount,
        taxPercent: bill.taxPercent,
        grand_total: bill.grandTotal,
        notes: bill.notes || "Draft / Quotation Estimate",
        created_at: bill.savedAt,
      };

      const doc = generateInvoicePDF(draftInvoiceData);
      doc.autoPrint();
      const blobUrl = doc.output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (e) {
      console.error("Failed to print draft estimate:", e);
      setFeedback({ type: "error", text: "Failed to generate print preview." });
    }
  };

  // Handle Send WhatsApp Reminder for a Saved Bill
  const handleSendWhatsAppReminder = async (bill: SavedBill, phoneToSend: string) => {
    let rawDigits = phoneToSend.trim().replace(/[^0-9]/g, "");
    let formattedPhone = "";
    if (rawDigits.length === 10) {
      formattedPhone = `91${rawDigits}`;
    } else if (rawDigits.length === 11 && rawDigits.startsWith("0")) {
      formattedPhone = `91${rawDigits.slice(1)}`;
    } else if (rawDigits.length === 12 && rawDigits.startsWith("91")) {
      formattedPhone = rawDigits;
    } else if (rawDigits.length > 0) {
      formattedPhone = rawDigits;
    }

    // 1. Generate clean official PDF Draft Estimate
    let pdfFile: File | null = null;
    let doc: any = null;
    try {
      const draftInvoiceData = {
        invoice_number: bill.billNumber,
        customer_name: bill.customerName,
        customer_phone: bill.customerPhone || phoneToSend,
        payment_method: `${bill.paymentMethod.toUpperCase()} (ESTIMATE DRAFT)`,
        items: bill.cart,
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        taxAmount: bill.taxAmount,
        taxPercent: bill.taxPercent,
        grand_total: bill.grandTotal,
        notes: bill.notes || "Draft / Quotation Estimate",
        created_at: bill.savedAt,
      };
      doc = generateInvoicePDF(draftInvoiceData);
      const pdfBlob = doc.output("blob");
      const pdfFilename = `Estimate_${bill.billNumber}.pdf`;
      pdfFile = new File([pdfBlob], pdfFilename, { type: "application/pdf" });
    } catch (err) {
      console.error("PDF generation error:", err);
    }

    // 2. Items list text for WhatsApp message
    const itemsText = bill.cart
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.product.name}*\n   Qty: ${it.quantity} ${it.product.unit} × Rs. ${it.unit_price} = *Rs. ${it.total_price.toLocaleString("en-IN")}*`
      )
      .join("\n\n");

    const messageText =
      `*PROVISION SMART WHOLESALE STORE*\n` +
      `APMC Wholesale Market Yard • Phone: +91 98250 12345\n` +
      `------------------------------------\n` +
      `📑 *DRAFT BILL / ESTIMATE REMINDER*\n` +
      `*Hold Token:* #${bill.billNumber}\n` +
      `*Customer:* ${bill.customerName}\n` +
      `*Date:* ${new Date(bill.savedAt).toLocaleString("en-IN")}\n` +
      `------------------------------------\n` +
      `🛒 *Items Reserved in Order:*\n` +
      `${itemsText}\n` +
      `------------------------------------\n` +
      `*Subtotal:* Rs. ${bill.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
      (bill.discountAmount > 0
        ? `*Discount Savings:* - Rs. ${bill.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`
        : ``) +
      (bill.taxAmount > 0
        ? `*GST Tax (${bill.taxPercent}%):* + Rs. ${bill.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`
        : ``) +
      `💰 *TOTAL PAYABLE:* *Rs. ${bill.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}*\n` +
      `💳 *Payment Mode:* ${bill.paymentMethod.toUpperCase()}\n` +
      (bill.notes ? `📝 *Note:* ${bill.notes}\n` : ``) +
      `------------------------------------\n` +
      `⏳ *Status:* Your order is currently on HOLD at Counter.\n` +
      `Please visit our shopfloor billing counter or reply to this message to confirm dispatch.\n` +
      `Thank you!`;

    // 3. Try Native Web Share API first (attaches actual PDF directly on Mobile / macOS)
    if (pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Draft Estimate #${bill.billNumber}`,
          text: messageText,
        });
        setWhatsappModalBill(null);
        setFeedback({
          type: "success",
          text: `PDF Estimate #${bill.billNumber} shared directly to WhatsApp!`,
        });
        return;
      } catch (err) {
        // User cancelled share or fallback to Web WhatsApp
      }
    }

    // 4. Desktop Web Fallback: Download PDF copy and open WhatsApp chat
    if (doc) {
      doc.save(`Estimate_${bill.billNumber}.pdf`);
    }

    const encoded = encodeURIComponent(messageText);
    const whatsappUrl = formattedPhone
      ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(whatsappUrl, "_blank");
    setWhatsappModalBill(null);
    setFeedback({
      type: "success",
      text: `Estimate #${bill.billNumber} PDF downloaded and WhatsApp chat opened!`,
    });
  };

  // Filtered & Sorted Saved Bills List
  const filteredSavedBills = React.useMemo(() => {
    let list = [...savedBills];

    if (savedBillsSearch.trim()) {
      const q = savedBillsSearch.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.billNumber.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          (b.customerPhone && b.customerPhone.includes(q)) ||
          (b.notes && b.notes.toLowerCase().includes(q)) ||
          b.cart.some(
            (item) =>
              item.product.name.toLowerCase().includes(q) ||
              item.product.sku.toLowerCase().includes(q)
          )
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (savedBillsFilter === "today") {
      list = list.filter((b) => b.savedAt.startsWith(todayStr));
    } else if (savedBillsFilter === "high_value") {
      list = list.filter((b) => b.grandTotal >= 10000);
    } else if (savedBillsFilter === "khata") {
      list = list.filter((b) => b.paymentMethod === "khata");
    } else if (savedBillsFilter === "cash") {
      list = list.filter((b) => b.paymentMethod === "cash");
    } else if (savedBillsFilter === "upi") {
      list = list.filter((b) => b.paymentMethod === "upi");
    }

    list.sort((a, b) => {
      if (savedBillsSort === "newest") {
        return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      }
      if (savedBillsSort === "oldest") {
        return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
      }
      if (savedBillsSort === "amount_high") {
        return b.grandTotal - a.grandTotal;
      }
      if (savedBillsSort === "amount_low") {
        return a.grandTotal - b.grandTotal;
      }
      return 0;
    });

    return list;
  }, [savedBills, savedBillsSearch, savedBillsFilter, savedBillsSort]);

  const totalSavedValue = savedBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const todaySavedCount = savedBills.filter((b) =>
    b.savedAt.startsWith(new Date().toISOString().split("T")[0])
  ).length;
  const khataSavedCount = savedBills.filter((b) => b.paymentMethod === "khata").length;

  // Filtered Passed Invoices (Completed Invoices History)
  const filteredPassedInvoices = React.useMemo(() => {
    let list = [...passedInvoices];

    if (passedInvoicesSearch.trim()) {
      const q = passedInvoicesSearch.toLowerCase().trim();
      list = list.filter((inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_phone?.toLowerCase().includes(q) ||
        inv.created_by_name?.toLowerCase().includes(q) ||
        inv.items?.some((it: any) =>
          (it.product_name || it.product?.name || "").toLowerCase().includes(q) ||
          (it.sku || it.product?.sku || "").toLowerCase().includes(q)
        )
      );
    }

    if (passedInvoicesFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      list = list.filter((inv) => {
        const d = inv.created_at ? new Date(inv.created_at).toISOString().split("T")[0] : "";
        return d === today;
      });
    } else if (passedInvoicesFilter === "yesterday") {
      const yest = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      list = list.filter((inv) => {
        const d = inv.created_at ? new Date(inv.created_at).toISOString().split("T")[0] : "";
        return d === yest;
      });
    } else if (passedInvoicesFilter !== "all" && ["cash", "upi", "khata", "card"].includes(passedInvoicesFilter)) {
      list = list.filter((inv) => inv.payment_method === passedInvoicesFilter);
    }

    // Specific Date filter
    if (passedInvoicesDate) {
      list = list.filter((inv) => {
        if (!inv.created_at) return false;
        const invDate = new Date(inv.created_at).toISOString().split("T")[0];
        return invDate === passedInvoicesDate;
      });
    }

    // Custom Date Range filter
    if (passedInvoicesStartDate) {
      list = list.filter((inv) => {
        if (!inv.created_at) return false;
        const invDate = new Date(inv.created_at).toISOString().split("T")[0];
        return invDate >= passedInvoicesStartDate;
      });
    }
    if (passedInvoicesEndDate) {
      list = list.filter((inv) => {
        if (!inv.created_at) return false;
        const invDate = new Date(inv.created_at).toISOString().split("T")[0];
        return invDate <= passedInvoicesEndDate;
      });
    }

    return list;
  }, [
    passedInvoices,
    passedInvoicesSearch,
    passedInvoicesFilter,
    passedInvoicesDate,
    passedInvoicesStartDate,
    passedInvoicesEndDate,
  ]);

  const totalPassedRevenue = passedInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayPassedInvoices = passedInvoices.filter((inv) => inv.created_at?.startsWith(todayDateStr));
  const todayPassedRevenue = todayPassedInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const khataPassedCount = passedInvoices.filter((inv) => inv.payment_method === "khata").length;
  const cashPassedRevenue = passedInvoices
    .filter((inv) => inv.payment_method === "cash")
    .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const upiPassedRevenue = passedInvoices
    .filter((inv) => inv.payment_method === "upi")
    .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);

  // Helper: Open Completed Receipt Modal for any Passed Bill
  const handleOpenPassedInvoiceModal = (inv: any) => {
    const normalizedItems = (inv.items || []).map((it: any) => ({
      product: {
        id: it.product_id || it.product?.id || `p_${Math.random()}`,
        name: it.product_name || it.product?.name || "Product Item",
        sku: it.sku || it.product?.sku || "-",
        unit: it.unit || it.product?.unit || "Unit",
        selling_price: Number(it.unit_price ?? it.unitPrice ?? 0),
        cost_price: Number(it.cost_price ?? 0),
      },
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price ?? it.unitPrice ?? 0),
      total_price: Number(it.total_price ?? it.totalPrice ?? (it.quantity * (it.unit_price || 0))),
    }));

    setCompletedInvoice({
      ...inv,
      items: normalizedItems,
      subtotal: Number(inv.subtotal || inv.grand_total || 0),
      discountAmount: Number(inv.discount_amount ?? inv.discountAmount ?? 0),
      taxAmount: Number(inv.tax_amount ?? inv.taxAmount ?? 0),
      taxPercent: Number(inv.tax_percent ?? inv.taxPercent ?? 0),
      notes: inv.notes || "",
    });
    setShowReceiptModal(true);
  };

  // Helper: Quick Print PDF for a Passed Bill
  const handlePrintPassedInvoicePDF = (inv: any) => {
    try {
      const doc = generateInvoicePDF(inv);
      doc.autoPrint();
      const blobUrl = doc.output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (e) {
      handleOpenPassedInvoiceModal(inv);
    }
  };

  // Helper: Direct Download PDF for a Passed Bill
  const handleDownloadPassedInvoicePDF = (inv: any) => {
    try {
      const doc = generateInvoicePDF(inv);
      doc.save(`Invoice_${inv.invoice_number}.pdf`);
    } catch (e) {
      console.error("Failed to download PDF:", e);
    }
  };

  // Helper: Open Edit Passed Bill & Payment Mode Modal
  const handleOpenEditInvoiceModal = (inv: any) => {
    setEditingInvoice(inv);
    setEditCustomerName(inv.customer_name || "");
    setEditCustomerPhone(inv.customer_phone || "");
    const method = (inv.payment_method || "cash").toLowerCase();
    setEditPaymentMethod(method === "khata" ? "khata" : method === "upi" ? "upi" : method === "card" ? "card" : "cash");
    setEditPaymentStatus((inv.payment_status || (method === "khata" ? "unpaid" : "paid")).toLowerCase() as any);
    setEditNotes(inv.notes || "");
    setEditError("");
    setShowEditInvoiceModal(true);
  };

  // Helper: Save Invoice Updates to Server & Khata Ledger
  const handleSaveInvoiceEdit = async () => {
    if (!editingInvoice) return;
    if (!editCustomerName.trim()) {
      setEditError("Customer Name is required.");
      return;
    }
    const cleanPhone = editCustomerPhone.replace(/\D/g, "");
    if (!editCustomerPhone.trim() || cleanPhone.length < 10) {
      setEditError("Customer 10-digit mobile number is required.");
      return;
    }

    setIsSavingInvoiceEdit(true);
    setEditError("");
    try {
      const res = await fetch("/api/pos/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: editingInvoice.id,
          customerName: editCustomerName.trim(),
          customerPhone: editCustomerPhone.trim(),
          paymentMethod: editPaymentMethod,
          paymentStatus: editPaymentStatus,
          notes: editNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setEditError(data.error || "Failed to update invoice.");
        return;
      }

      // Success feedback
      setShowEditInvoiceModal(false);
      setFeedback({
        type: "success",
        text: `Invoice #${editingInvoice.invoice_number} updated successfully! Mode changed to ${editPaymentMethod.toUpperCase()}.`,
      });

      // Reload passed invoices
      await loadPassedInvoices();

      // If completed invoice modal is active for this invoice, update it too
      if (completedInvoice && completedInvoice.id === editingInvoice.id) {
        setCompletedInvoice((prev: any) => ({
          ...prev,
          customer_name: editCustomerName.trim(),
          customer_phone: editCustomerPhone.trim(),
          payment_method: editPaymentMethod,
          payment_status: editPaymentStatus,
          notes: editNotes.trim(),
        }));
      }

      if (onSaleCompleted) {
        onSaleCompleted();
      }
    } catch (err: any) {
      console.error("Save invoice edit error:", err);
      setEditError(err.message || "An unexpected error occurred while saving invoice changes.");
    } finally {
      setIsSavingInvoiceEdit(false);
    }
  };

  // Handle Checkout with strict pre-validation & server synchronization
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setFeedback({ type: "error", text: "Cart is empty. Please select products to bill." });
      return;
    }

    // Pre-flight check: ensure no items exceed available stock
    for (const item of cart) {
      const liveProd = products.find((p) => p.id === item.product.id) || item.product;
      if (liveProd.stock_quantity <= 0) {
        setFeedback({
          type: "error",
          text: `Cannot complete sale: "${liveProd.name}" is OUT OF STOCK. Please remove it from cart.`,
        });
        loadData();
        return;
      }
      if (item.quantity > liveProd.stock_quantity) {
        setFeedback({
          type: "error",
          text: `Cannot complete sale: "${liveProd.name}" exceeds available stock (${liveProd.stock_quantity} ${liveProd.unit} available, ${item.quantity} in cart).`,
        });
        loadData();
        return;
      }
    }

    if (paymentMethod === "khata" && !selectedCustomer) {
      setFeedback({ type: "error", text: "Please select a registered Khata customer for credit billing." });
      return;
    }

    const effectivePhone = (selectedCustomer?.phone || customerPhone || "").trim();
    const cleanDigits = effectivePhone.replace(/\D/g, "");
    if (!effectivePhone || cleanDigits.length < 10) {
      setFeedback({
        type: "error",
        text: "Customer mobile number is compulsory to generate bill. Please enter a valid 10-digit mobile number.",
      });
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
      if (!res.ok) {
        // If server rejected due to insufficient stock, reload live data immediately to reconcile cart
        await loadData();
        throw new Error(data.error || "Checkout failed");
      }

      // Immediately update local product stock state so UI reflects new live stock without waiting
      if (data.updatedStock && Array.isArray(data.updatedStock)) {
        setProducts((prev) =>
          prev.map((p) => {
            const match = data.updatedStock.find((u: any) => u.productId === p.id);
            if (match) {
              return {
                ...p,
                stock_quantity: match.remainingStock,
                stock_status: match.status,
              };
            }
            return p;
          })
        );
      }

      setCompletedInvoice({
        ...data.invoice,
        items: [...cart],
        updatedStock: data.updatedStock || [],
        subtotal,
        discountAmount,
        taxAmount,
        taxPercent,
        notes,
      });

      const stockSummary = (data.updatedStock || [])
        .map((s: any) => `${s.productName}: ${s.remainingStock} ${s.unit} left in Stock (${s.quantitySold} ${s.unit} Billed)`)
        .join(" | ");

      setFeedback({
        type: "success",
        text: `✓ Bill Passed! Invoice #${data.invoice.invoice_number} completed. Live Stock Remaining: ${stockSummary}`,
      });

      setShowReceiptModal(true);
      clearCart();
      await loadData();
      if (onSaleCompleted) onSaleCompleted();
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Checkout failed. Please try again." });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in text-slate-100">
      {/* Top Navigation & View Switcher Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
              Wholesale POS
            </span>
            <span className="text-xs text-slate-400 font-medium">Quick Billing & Saved Hold Invoices</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            {viewMode === "counter" ? (
              <>
                <ShoppingCart className="w-6 h-6 text-blue-400" />
                Shopfloor Quick Billing Counter
              </>
            ) : viewMode === "saved_bills" ? (
              <>
                <Bookmark className="w-6 h-6 text-indigo-400" />
                Saved Bills & Hold Invoices
              </>
            ) : (
              <>
                <FileText className="w-6 h-6 text-emerald-400" />
                Passed Bills & Invoice Archive
              </>
            )}
          </h2>
        </div>

        {/* View Mode Toggle & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Switcher */}
          <div className="bg-white/5 p-1 rounded-2xl flex items-center border border-white/10">
            <button
              onClick={() => setViewMode("counter")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "counter"
                  ? "bg-blue-500/20 text-blue-300 shadow-sm border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Billing Counter
              {cart.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-mono font-bold">
                  {cart.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setViewMode("saved_bills")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "saved_bills"
                  ? "bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Saved Bills
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  savedBills.length > 0
                    ? "bg-indigo-600 text-white"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {savedBills.length}
              </span>
            </button>

            <button
              onClick={() => {
                setViewMode("passed_bills");
                loadPassedInvoices();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "passed_bills"
                  ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Passed Bills
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  passedInvoices.length > 0
                    ? "bg-emerald-600 text-white"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {passedInvoices.length}
              </span>
            </button>
          </div>

          {/* Sync Stock Button */}
          <button
            onClick={() => loadData()}
            disabled={isSearching}
            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-500/30"
            title="Sync latest live stock quantities directly from database"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSearching ? "animate-spin text-blue-600" : ""}`} />
            {isSearching ? "Syncing..." : "Sync Stock"}
          </button>

          {viewMode === "counter" && (
            <button
              onClick={clearCart}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Cart
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2.5 animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: LIVE BILLING COUNTER */}
      {viewMode === "counter" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT (7 Cols): Product Catalog & Scanner */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
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
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-xs font-medium focus:border-blue-400"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2.5 glass-input rounded-xl text-xs font-medium"
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
                  const heldQty = heldStockMap[p.id] || 0;
                  const availableStock = Math.max(0, p.stock_quantity - heldQty);
                  const isOutOfStock = availableStock <= 0;
                  const inCartQty = cart.find((i) => i.product.id === p.id)?.quantity || 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`p-3.5 rounded-2xl border transition text-left flex flex-col justify-between select-none relative group ${
                        isOutOfStock
                          ? "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                          : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-blue-400/50 shadow-lg cursor-pointer"
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
                        <h4 className="text-xs font-bold text-slate-100 line-clamp-2 mt-0.5 leading-snug">
                          {p.name}
                        </h4>
                        <p className="text-[10px] font-mono text-slate-400 mt-1">
                          SKU: {p.sku}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-amber-400 font-mono">
                            ₹{p.selling_price.toLocaleString("en-IN")}
                          </div>
                          {heldQty > 0 ? (
                            <div className="flex flex-col mt-0.5">
                              <span
                                className={`text-[10px] font-black ${
                                  isOutOfStock ? "text-red-400" : "text-emerald-400"
                                }`}
                              >
                                {isOutOfStock ? "0 Available" : `${availableStock} ${p.unit} Available`}
                              </span>
                              <span className="text-[9px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 inline-block w-fit mt-0.5">
                                {heldQty} in Saved Bills
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`text-[10px] font-semibold ${
                                isOutOfStock
                                  ? "text-red-400 font-bold"
                                  : p.stock_quantity <= p.reorder_level
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {isOutOfStock ? "Out of Stock" : `${p.stock_quantity} ${p.unit}`}
                            </span>
                          )}
                        </div>

                        {!isOutOfStock && (
                          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
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

          {/* RIGHT (5 Cols): Active Cart, Hold Option & Complete Sale */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-100">Billing Cart ({cart.length} items)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("saved_bills")}
                    className="text-[11px] font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 px-2.5 py-1 rounded-xl border border-indigo-500/30 transition flex items-center gap-1"
                    title="View held & saved bills"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Saved Bills ({savedBills.length})
                  </button>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Customer Selector / Khata Link */}
              <div className="space-y-2 p-3 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Customer Type:</span>
                  <span className="text-[11px] text-blue-400 font-medium">B2B Khata / Retail Walk-in</span>
                </div>

                <select
                  value={selectedCustomer?.id || "walk_in"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "walk_in") {
                      setSelectedCustomer(null);
                      setCustomerName("Walk-in Customer");
                      setCustomerPhone("");
                      setPaymentMethod("cash");
                    } else {
                      const cust = customers.find((c) => c.id === val);
                      if (cust) {
                        setSelectedCustomer(cust);
                        setCustomerName(cust.name);
                        setCustomerPhone(cust.phone);
                        setPaymentMethod("khata");
                      }
                    }
                  }}
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs font-semibold"
                >
                  <option value="walk_in">Walk-in Cash Retail Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.store_name} — {c.name} (Khata Bal: ₹{c.current_balance.toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>

                {selectedCustomer && (
                  <div className="p-2.5 bg-purple-500/15 rounded-xl border border-purple-500/30 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-purple-300 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{selectedCustomer.store_name} ({selectedCustomer.name})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        📞 {selectedCustomer.phone} • Current Due: ₹{selectedCustomer.current_balance.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                      Khata Linked
                    </span>
                  </div>
                )}

                {!selectedCustomer && (
                  <div className="space-y-1.5 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer Name"
                        className="px-3 py-1.5 glass-input rounded-xl text-xs"
                      />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Mobile (Compulsory) *"
                        maxLength={13}
                        required
                        className="px-3 py-1.5 glass-input rounded-xl text-xs border-amber-500/40 focus:border-amber-400 placeholder:text-amber-300/60"
                      />
                    </div>
                    <p className="text-[10px] text-amber-300/80 font-medium flex items-center gap-1">
                      <span>* 10-digit mobile number is mandatory to generate bill</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-2xl bg-white/5">
                {cart.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 space-y-2">
                    <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">Cart is empty</p>
                    <p className="text-[11px] text-slate-500">Click products from the catalog to add items</p>
                    {savedBills.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewMode("saved_bills")}
                        className="mt-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-indigo-500/30"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        View {savedBills.length} Saved Hold Bills
                      </button>
                    )}
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="p-3 flex items-center justify-between gap-3 hover:bg-white/5 transition">
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-slate-200 truncate">{item.product.name}</h5>
                        <p className="text-[11px] text-slate-400 font-mono">
                          ₹{item.unit_price} × {item.quantity} = ₹{item.total_price.toLocaleString("en-IN")}
                          <span className="ml-2 text-[10px] text-slate-500">
                            (Stock: {item.product.stock_quantity})
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-xs text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition"
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
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="₹0"
                      className="w-full px-3 py-1.5 glass-input rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">GST Tax Slab</label>
                    <select
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="w-full px-3 py-1.5 glass-input rounded-xl text-xs font-semibold"
                    >
                      <option value={0}>0% (Tax Exempt)</option>
                      <option value={5}>5% GST (Grains / Oil)</option>
                      <option value={12}>12% GST (Packaged Goods)</option>
                      <option value={18}>18% GST (Personal Care)</option>
                    </select>
                  </div>
                </div>

                {/* Optional Notes for this bill */}
                <div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Bill / Hold Notes (e.g. Order token #, Delivery time)"
                    className="w-full px-3 py-1.5 glass-input rounded-xl text-xs"
                  />
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                        paymentMethod === "cash"
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      Cash
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                        paymentMethod === "upi"
                          ? "bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      UPI / QR
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("khata")}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                        paymentMethod === "khata"
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      Khata
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                        paymentMethod === "card"
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      Card
                    </button>
                  </div>
                </div>

                {/* Bill Totals Summary Card */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Discount:</span>
                      <span>- ₹{discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-slate-400 font-medium">
                      <span>GST ({taxPercent}%):</span>
                      <span>+ ₹{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-200">Total Payable:</span>
                    <span className="text-xl font-black text-amber-400 font-mono">
                      ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Dual Buttons: Save Bill (Hold Draft) AND Complete Sale */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {/* Save Bill / Hold Button */}
                  <button
                    type="button"
                    onClick={handleSaveCurrentBill}
                    disabled={cart.length === 0}
                    className="sm:col-span-1 py-3 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-black shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save current cart as draft without finalizing invoice"
                  >
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    Save Bill (Hold)
                  </button>

                  {/* Complete Sale Button */}
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || cart.length === 0}
                    className="sm:col-span-2 py-3.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-2xl text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCheckingOut ? (
                      "Processing Sale..."
                    ) : (
                      <>
                        <PackageCheck className="w-4 h-4 shrink-0" />
                        Complete Sale (₹{grandTotal.toLocaleString("en-IN")})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED SAVED BILLS BOARD & FILTERS */}
      {viewMode === "saved_bills" && (
        <div className="space-y-6">
          {/* Summary Metric Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-3xl border border-white/10 shadow-lg flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Saved</p>
                <h4 className="text-xl font-black text-slate-100">{savedBills.length} Bills</h4>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-3xl border border-emerald-500/30 shadow-lg flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Hold Value</p>
                <h4 className="text-xl font-black text-emerald-400 font-mono">₹{totalSavedValue.toLocaleString("en-IN")}</h4>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-3xl border border-blue-500/30 shadow-lg flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saved Today</p>
                <h4 className="text-xl font-black text-blue-400">{todaySavedCount} Bills</h4>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-3xl border border-purple-500/30 shadow-lg flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Khata Credit Holds</p>
                <h4 className="text-xl font-black text-purple-400">{khataSavedCount} Bills</h4>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={savedBillsSearch}
                  onChange={(e) => setSavedBillsSearch(e.target.value)}
                  placeholder="Search by Bill #, Customer, Phone, SKU..."
                  className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-xs font-medium focus:border-indigo-400"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                <button
                  onClick={() => setSavedBillsFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    savedBillsFilter === "all"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  All ({savedBills.length})
                </button>
                <button
                  onClick={() => setSavedBillsFilter("today")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    savedBillsFilter === "today"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Today ({todaySavedCount})
                </button>
                <button
                  onClick={() => setSavedBillsFilter("high_value")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    savedBillsFilter === "high_value"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  High Value (≥₹10k)
                </button>
                <button
                  onClick={() => setSavedBillsFilter("khata")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    savedBillsFilter === "khata"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Khata Holds
                </button>
                <button
                  onClick={() => setSavedBillsFilter("cash")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    savedBillsFilter === "cash"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => setSavedBillsFilter("upi")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    savedBillsFilter === "upi"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  UPI
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Sort:
                </span>
                <select
                  value={savedBillsSort}
                  onChange={(e: any) => setSavedBillsSort(e.target.value)}
                  className="px-3 py-2 glass-input rounded-xl text-xs font-semibold"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount_high">Amount: High to Low</option>
                  <option value="amount_low">Amount: Low to High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Saved Bills List / Cards Grid */}
          {filteredSavedBills.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 space-y-3 shadow-lg">
              <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto">
                <Bookmark className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-100">No Saved Bills Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {savedBillsSearch || savedBillsFilter !== "all"
                  ? "No saved bills match your current filters. Try resetting search or filter pills."
                  : "You haven't saved any draft bills yet. When creating a bill in Counter POS, click 'Save Bill (Hold)' to hold it here for later."}
              </p>
              <button
                onClick={() => setViewMode("counter")}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <ShoppingCart className="w-4 h-4" /> Go to Billing Counter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSavedBills.map((bill) => {
                const dateObj = new Date(bill.savedAt);
                const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                const dateStr = dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

                return (
                  <div
                    key={bill.id}
                    className="glass-panel rounded-3xl border border-white/10 hover:border-indigo-400/50 shadow-lg transition flex flex-col justify-between overflow-hidden"
                  >
                    {/* Card Top */}
                    <div className="p-5 space-y-3.5">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                            #{bill.billNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {dateStr}, {timeStr}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            bill.paymentMethod === "khata"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              : bill.paymentMethod === "upi"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {bill.paymentMethod}
                        </span>
                      </div>

                      {/* Customer info */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 truncate">
                          {bill.customerName}
                        </h4>
                        {bill.customerPhone && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            📞 {bill.customerPhone}
                          </p>
                        )}
                      </div>

                      {/* Item Summary Chips / List */}
                      <div className="space-y-1.5 bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                          <span>Items ({bill.cart.length})</span>
                          <span>Qty / Rate</span>
                        </div>
                        <div className="max-h-24 overflow-y-auto divide-y divide-white/5 pr-1 space-y-1">
                          {bill.cart.map((item) => (
                            <div key={item.product.id} className="pt-1 flex items-center justify-between text-slate-300">
                              <span className="truncate pr-2 font-medium">{item.product.name}</span>
                              <span className="shrink-0 font-mono font-bold text-amber-400 text-[11px]">
                                {item.quantity} × ₹{item.unit_price}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes if any */}
                      {bill.notes && (
                        <p className="text-[11px] text-slate-300 italic bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                          📝 Note: {bill.notes}
                        </p>
                      )}

                      {/* Financial Breakdown */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Grand Total</span>
                          <span className="text-lg font-black text-amber-400 font-mono">
                            ₹{bill.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {bill.discountAmount > 0 && (
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            Saved ₹{bill.discountAmount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 bg-white/5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setWhatsappModalBill(bill);
                            setWhatsappTargetPhone(
                              bill.customerPhone
                                ? bill.customerPhone.replace(/^(\+91|91)/, "").trim()
                                : ""
                            );
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-emerald-500/30"
                          title="Remind customer on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          WhatsApp
                        </button>

                        <button
                          onClick={() => handlePrintDraftBill(bill)}
                          className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/10"
                          title="Print draft quotation / estimate"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                          Print Draft
                        </button>

                        <button
                          onClick={() => handleDeleteSavedBill(bill.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-xl hover:bg-white/10 transition"
                          title="Delete saved draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleLoadSavedBill(bill)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Resume & Bill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: PASSED BILLS & INVOICES ARCHIVE */}
      {viewMode === "passed_bills" && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Metrics Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 shadow-lg flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  Total Passed Bills
                </span>
                <div className="text-lg sm:text-xl font-black text-slate-100 leading-tight">
                  {passedInvoices.length} Bills
                </div>
                <span className="text-[11px] text-emerald-400 font-bold font-mono">
                  ₹{totalPassedRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Total
                </span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-blue-500/30 shadow-lg flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  Today's Passed Bills
                </span>
                <div className="text-lg sm:text-xl font-black text-slate-100 leading-tight">
                  {todayPassedInvoices.length} Bills
                </div>
                <span className="text-[11px] text-blue-400 font-bold font-mono">
                  ₹{todayPassedRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Today
                </span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 shadow-lg flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  Cash & UPI Sales
                </span>
                <div className="text-lg sm:text-xl font-black text-amber-400 leading-tight font-mono">
                  ₹{(cashPassedRevenue + upiPassedRevenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-indigo-400 font-bold">
                  Instant Paid Collections
                </span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-purple-500/30 shadow-lg flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  Khata Credit Bills
                </span>
                <div className="text-lg sm:text-xl font-black text-purple-400 leading-tight">
                  {khataPassedCount} Bills
                </div>
                <span className="text-[11px] text-purple-300 font-bold">
                  Tracked in Khata Ledger
                </span>
              </div>
            </div>
          </div>

          {/* Search, Filter Bar & Refresh */}
          <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={passedInvoicesSearch}
                  onChange={(e) => setPassedInvoicesSearch(e.target.value)}
                  placeholder="Search by Invoice # (e.g. 364576), customer name, mobile, item name, SKU..."
                  className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-xs font-medium focus:border-emerald-400"
                />
              </div>

              {/* Filter Pills & Actions */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPassedInvoicesFilter("all");
                    setPassedInvoicesDate("");
                    setPassedInvoicesStartDate("");
                    setPassedInvoicesEndDate("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    passedInvoicesFilter === "all" && !passedInvoicesDate && !passedInvoicesStartDate && !passedInvoicesEndDate
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  All ({passedInvoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPassedInvoicesFilter("today");
                    setPassedInvoicesDate("");
                    setPassedInvoicesStartDate("");
                    setPassedInvoicesEndDate("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    passedInvoicesFilter === "today"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Today ({todayPassedInvoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPassedInvoicesFilter("yesterday");
                    setPassedInvoicesDate("");
                    setPassedInvoicesStartDate("");
                    setPassedInvoicesEndDate("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    passedInvoicesFilter === "yesterday"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setPassedInvoicesFilter("cash")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    passedInvoicesFilter === "cash"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPassedInvoicesFilter("upi")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    passedInvoicesFilter === "upi"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  UPI
                </button>
                <button
                  type="button"
                  onClick={() => setPassedInvoicesFilter("khata")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    passedInvoicesFilter === "khata"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  Khata ({khataPassedCount})
                </button>

                <button
                  type="button"
                  onClick={() => setShowDateRangeFilter(!showDateRangeFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    showDateRangeFilter || passedInvoicesDate || passedInvoicesStartDate || passedInvoicesEndDate
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date Filter</span>
                </button>

                <button
                  type="button"
                  onClick={loadPassedInvoices}
                  disabled={isPassedInvoicesLoading}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
                  title="Reload latest passed invoices"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isPassedInvoicesLoading ? "animate-spin text-emerald-400" : ""}`} />
                  <span>Sync Bills</span>
                </button>
              </div>
            </div>

            {/* Expandable Date Selector & Date Range Filter */}
            {(showDateRangeFilter || passedInvoicesDate || passedInvoicesStartDate || passedInvoicesEndDate) && (
              <div className="p-4 bg-slate-900/70 dark:bg-slate-900/90 rounded-2xl border border-blue-500/30 flex flex-wrap items-center justify-between gap-4 animate-fade-in text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      Select Date:
                    </label>
                    <input
                      type="date"
                      value={passedInvoicesDate}
                      onChange={(e) => {
                        setPassedInvoicesDate(e.target.value);
                        setPassedInvoicesStartDate("");
                        setPassedInvoicesEndDate("");
                        setPassedInvoicesFilter("all");
                      }}
                      className="px-2.5 py-1.5 glass-input rounded-xl text-xs font-mono font-bold text-slate-100"
                    />
                  </div>

                  <span className="text-slate-500 font-bold hidden sm:inline">OR</span>

                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-300">From:</label>
                    <input
                      type="date"
                      value={passedInvoicesStartDate}
                      onChange={(e) => {
                        setPassedInvoicesStartDate(e.target.value);
                        setPassedInvoicesDate("");
                        setPassedInvoicesFilter("all");
                      }}
                      className="px-2.5 py-1.5 glass-input rounded-xl text-xs font-mono font-bold text-slate-100"
                    />
                    <label className="font-bold text-slate-300">To:</label>
                    <input
                      type="date"
                      value={passedInvoicesEndDate}
                      onChange={(e) => {
                        setPassedInvoicesEndDate(e.target.value);
                        setPassedInvoicesDate("");
                        setPassedInvoicesFilter("all");
                      }}
                      className="px-2.5 py-1.5 glass-input rounded-xl text-xs font-mono font-bold text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(passedInvoicesDate || passedInvoicesStartDate || passedInvoicesEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPassedInvoicesDate("");
                        setPassedInvoicesStartDate("");
                        setPassedInvoicesEndDate("");
                        setPassedInvoicesFilter("all");
                      }}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear Date Filter
                    </button>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs">
                    Showing {filteredPassedInvoices.length} Bills
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Passed Invoices Cards Grid */}
          {filteredPassedInvoices.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 space-y-3 shadow-lg">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                <Receipt className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-100">No Passed Bills Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {passedInvoicesSearch || passedInvoicesFilter !== "all"
                  ? "No passed bills match your current search or filters. Try adjusting your query."
                  : "No bills have been completed yet. When you complete a sale in Counter POS, it will automatically be saved and archived here."}
              </p>
              <button
                onClick={() => setViewMode("counter")}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <ShoppingCart className="w-4 h-4" /> Go to Billing Counter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPassedInvoices.map((inv) => {
                const dateObj = new Date(inv.created_at);
                const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                const dateStr = dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
                const itemsList = inv.items || [];

                return (
                  <div
                    key={inv.id}
                    className="glass-panel rounded-3xl border border-white/10 hover:border-emerald-400/50 shadow-lg transition flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className="p-5 space-y-3.5">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-slate-100">
                            #{inv.invoice_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {inv.payment_method === "khata" ? "Khata Credit" : "Tax Invoice"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {timeStr}, {dateStr}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-100 truncate">
                            {inv.customer_name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/10 uppercase">
                            {inv.payment_method} ({inv.payment_status?.toUpperCase() || "PAID"})
                          </span>
                        </div>
                        {inv.customer_phone && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            📞 {inv.customer_phone}
                          </p>
                        )}
                        {inv.created_by_name && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Billed by: {inv.created_by_name}
                          </p>
                        )}
                      </div>

                      {/* Items List Breakdown */}
                      <div className="space-y-1.5 bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                          <span>Items Billed ({itemsList.length})</span>
                          <span>Qty / Rate</span>
                        </div>
                        <div className="max-h-28 overflow-y-auto divide-y divide-white/5 pr-1 space-y-1">
                          {itemsList.map((item: any, idx: number) => {
                            const itemName = item.product_name || item.product?.name || "Item";
                            const itemUnit = item.unit || item.product?.unit || "";
                            const itemPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
                            const itemTotal = Number(item.total_price ?? item.totalPrice ?? (item.quantity * itemPrice));

                            return (
                              <div key={item.id || idx} className="pt-1 flex items-center justify-between text-slate-300">
                                <div className="min-w-0 pr-2">
                                  <p className="truncate font-medium text-xs text-slate-100">{itemName}</p>
                                  <span className="text-[10px] text-slate-500 font-mono">{item.sku || ""}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block font-mono font-bold text-amber-400 text-xs">
                                    ₹{itemTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {item.quantity} {itemUnit} × ₹{itemPrice}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Financial Totals */}
                      <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                        {inv.discount_amount > 0 && (
                          <div className="flex justify-between text-emerald-400 text-[11px] font-semibold">
                            <span>Discount Savings:</span>
                            <span className="font-mono">- ₹{Number(inv.discount_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {inv.tax_amount > 0 && (
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>GST Tax:</span>
                            <span className="font-mono">+ ₹{Number(inv.tax_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-1 border-t border-white/10">
                          <span className="text-xs font-bold text-slate-300">Grand Total:</span>
                          <span className="text-base font-black font-mono text-amber-400">
                            ₹{Number(inv.grand_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Bar */}
                    <div className="p-3 bg-white/5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const rawPhone = (inv.customer_phone || "").trim().replace(/[^0-9]/g, "");
                            let formattedPhone = "";
                            if (rawPhone.length === 10) formattedPhone = `91${rawPhone}`;
                            else if (rawPhone.length === 11 && rawPhone.startsWith("0")) formattedPhone = `91${rawPhone.slice(1)}`;
                            else if (rawPhone.length >= 12) formattedPhone = rawPhone;

                            try {
                              const doc = generateInvoicePDF(inv);
                              const pdfFilename = `Invoice_${inv.invoice_number}.pdf`;
                              doc.save(pdfFilename);
                            } catch (e) {}

                            const messageText =
                              `PROVISION SMART WHOLESALE STORE\n` +
                              `------------------------------------\n` +
                              `TAX INVOICE / BILL: #${inv.invoice_number}\n` +
                              `Customer: ${inv.customer_name}\n` +
                              `Date: ${new Date(inv.created_at).toLocaleString("en-IN")}\n` +
                              `Grand Total: Rs. ${Number(inv.grand_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
                              `Payment Mode: ${(inv.payment_method || "CASH").toUpperCase()} (${(inv.payment_status || "PAID").toUpperCase()})\n` +
                              `------------------------------------\n` +
                              `*** Attached: Official Tax Invoice PDF ***`;

                            const encoded = encodeURIComponent(messageText);
                            const url = formattedPhone
                              ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`
                              : `https://api.whatsapp.com/send?text=${encoded}`;
                            window.open(url, "_blank");
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-emerald-500/30"
                          title="Share Tax Invoice on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          WhatsApp
                        </button>

                        <button
                          onClick={() => handleDownloadPassedInvoicePDF(inv)}
                          className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/10"
                          title="Download Official Tax Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                          PDF
                        </button>

                        <button
                          onClick={() => handlePrintPassedInvoicePDF(inv)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                          title="Quick Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditInvoiceModal(inv)}
                          className="px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-blue-500/30 cursor-pointer"
                          title="Edit Bill details & change payment mode (Cash, UPI, Khata)"
                        >
                          <Pencil className="w-3.5 h-3.5 text-blue-400" />
                          Edit Bill
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenPassedInvoiceModal(inv)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Bill
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completed Invoice Printable Modal & WhatsApp Dispatch */}
      {showReceiptModal && completedInvoice && (
        <div className="receipt-modal-overlay fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="receipt-modal-container glass-modal rounded-3xl max-w-xl w-full shadow-2xl border border-white/10 overflow-hidden animate-fade-in my-8 text-slate-100 flex flex-col max-h-[90vh]">
            {/* Header (Hidden on Print) */}
            <div className="no-print px-6 py-4 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 border-b border-white/10 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">Sale Completed Successfully</h3>
                  <p className="text-xs text-blue-300">Invoice #{completedInvoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* WhatsApp Phone Quick Dispatch Bar (Hidden on Print) */}
            <div className="no-print px-6 py-3.5 bg-emerald-950/40 border-b border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Send PDF Bill to Customer on WhatsApp:</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center glass-input border border-emerald-500/40 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20">
                  <span className="px-2.5 py-1.5 bg-emerald-500/20 text-emerald-300 font-bold text-xs border-r border-emerald-500/30 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    defaultValue={
                      completedInvoice.customer_phone
                        ? completedInvoice.customer_phone.replace(/^(\+91|91)/, "").trim()
                        : ""
                    }
                    id="whatsapp-phone-input"
                    placeholder="10-digit mobile number"
                    className="px-3 py-1.5 text-xs font-semibold text-slate-100 outline-hidden w-36 sm:w-44 bg-transparent placeholder:text-slate-500"
                  />
                </div>
                <button
                  onClick={async () => {
                    const input = document.getElementById("whatsapp-phone-input") as HTMLInputElement;
                    let rawPhone = (input?.value || completedInvoice.customer_phone || "").trim().replace(/[^0-9]/g, "");

                    let formattedPhone = "";
                    if (rawPhone.length === 10) {
                      formattedPhone = `91${rawPhone}`;
                    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
                      formattedPhone = `91${rawPhone.slice(1)}`;
                    } else if (rawPhone.length === 12 && rawPhone.startsWith("91")) {
                      formattedPhone = rawPhone;
                    } else if (rawPhone.length > 0) {
                      formattedPhone = rawPhone;
                    }

                    const doc = generateInvoicePDF(completedInvoice);
                    const pdfBlob = doc.output("blob");
                    const pdfFilename = `Invoice_${completedInvoice.invoice_number}.pdf`;
                    const pdfFile = new File([pdfBlob], pdfFilename, { type: "application/pdf" });

                    doc.save(pdfFilename);

                    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                      try {
                        await navigator.share({
                          files: [pdfFile],
                          title: `Tax Invoice #${completedInvoice.invoice_number}`,
                          text: `Tax Invoice #${completedInvoice.invoice_number} from PROVISION SMART (Grand Total: Rs. ${completedInvoice.grand_total})`,
                        });
                        return;
                      } catch (err) {}
                    }

                    const messageText =
                      `PROVISION SMART WHOLESALE STORE\n` +
                      `APMC Wholesale Market Yard • GSTIN: 24AAACP1234F1Z5\n` +
                      `------------------------------------\n` +
                      `TAX INVOICE / BILL: #${completedInvoice.invoice_number}\n` +
                      `Customer: ${completedInvoice.customer_name}\n` +
                      `Date: ${new Date().toLocaleString("en-IN")}\n` +
                      `Grand Total: Rs. ${completedInvoice.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
                      `------------------------------------\n` +
                      `Attached: Official Tax Invoice PDF (${pdfFilename})\n` +
                      `*** This is a Computer Generated Bill. No signature required. ***`;

                    const encodedMessage = encodeURIComponent(messageText);
                    const whatsappUrl = formattedPhone
                      ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`
                      : `https://api.whatsapp.com/send?text=${encodedMessage}`;

                    window.open(whatsappUrl, "_blank");
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Send PDF on WhatsApp
                </button>
              </div>
            </div>

            {/* Live Stock Calculation & Remaining Inventory Status (Non-Printable) */}
            {completedInvoice.updatedStock && completedInvoice.updatedStock.length > 0 && (
              <div className="no-print mx-6 mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Live Inventory Stock Status After Bill
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {completedInvoice.updatedStock.length} Product(s) Deducted Live
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {completedInvoice.updatedStock.map((st: any) => (
                    <div
                      key={st.productId}
                      className="p-2.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-100 truncate">{st.productName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Billed: -{st.quantitySold} {st.unit} (Prev: {st.previousStock} {st.unit})
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                            st.status === "out_of_stock" || st.remainingStock <= 0
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : st.status === "low_stock"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {st.remainingStock} {st.unit} Left
                        </span>
                        <span className="block text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                          {st.status === "out_of_stock" || st.remainingStock <= 0
                            ? "Out of Stock"
                            : st.status === "low_stock"
                            ? "Low Stock Alert"
                            : "Available in Stock"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Printable Receipt Body */}
            <div id="printable-receipt" className="p-6 space-y-4 overflow-y-auto flex-1 bg-white text-slate-900">
              <div className="text-center pb-3 border-b-2 border-slate-900">
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  PROVISION SMART
                </h2>
                <p className="text-xs font-bold text-slate-700">Wholesale Goods & General Provision Store</p>
                <p className="text-[11px] text-slate-600 font-medium">
                  APMC Wholesale Market Yard • GSTIN: 24AAACP1234F1Z5 • Phone: +91 98250 12345
                </p>
                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-100 rounded-full text-[11px] font-black uppercase tracking-wider text-slate-800 border border-slate-300">
                  TAX INVOICE / CASH MEMO
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-b border-dashed border-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Invoice Number</span>
                  <strong className="font-mono text-sm text-slate-900 font-black">#{completedInvoice.invoice_number}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Date & Time</span>
                  <span className="font-semibold text-slate-800">{new Date().toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer Name</span>
                  <strong className="text-slate-900 font-bold">{completedInvoice.customer_name}</strong>
                  {completedInvoice.customer_phone && (
                    <span className="block text-[11px] text-slate-600 font-mono">{completedInvoice.customer_phone}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="font-black text-xs uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 border border-slate-300 inline-block">
                    {completedInvoice.payment_method} (PAID)
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 uppercase font-black text-[10px]">
                    <th className="text-left py-2 font-black">Item Description</th>
                    <th className="text-center py-2 font-black">Qty</th>
                    <th className="text-right py-2 font-black">Unit Rate (₹)</th>
                    <th className="text-right py-2 font-black">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {completedInvoice.items.map((it: any) => {
                    const updatedMatch = completedInvoice.updatedStock?.find(
                      (u: any) => u.productId === it.product.id
                    );
                    return (
                      <tr key={it.product.id}>
                        <td className="py-2.5 pr-2">
                          <div className="font-bold text-slate-900">{it.product.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-mono">SKU: {it.product.sku}</span>
                            {updatedMatch && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Stock Left: {updatedMatch.remainingStock} {it.product.unit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-2.5 font-bold text-slate-900">
                          {it.quantity} {it.product.unit}
                        </td>
                        <td className="text-right py-2.5 font-mono">
                          ₹{it.unit_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-2.5 font-bold font-mono text-slate-900">
                          ₹{it.total_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Total calculations */}
              <div className="pt-3 border-t-2 border-slate-900 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal ({completedInvoice.items.length} items):</span>
                  <span className="font-mono font-bold">
                    ₹{completedInvoice.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {completedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Discount Savings:</span>
                    <span className="font-mono">
                      - ₹{completedInvoice.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {completedInvoice.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>GST Tax ({completedInvoice.taxPercent || 0}%):</span>
                    <span className="font-mono font-bold">
                      + ₹{completedInvoice.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-sm font-black text-slate-900">
                  <span className="text-base uppercase">Grand Total:</span>
                  <span className="text-xl font-black font-mono text-slate-900">
                    ₹{completedInvoice.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Computer Generated Notice */}
              <div className="pt-4 mt-2 border-t border-dashed border-slate-300 text-center space-y-1">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  *** This is a Computer Generated Bill. No signature required. ***
                </p>
                <p className="text-[10px] text-slate-500">
                  Goods once sold can be exchanged within 7 days with original invoice. Thank you for your business!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="no-print p-4 bg-white/5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (completedInvoice) {
                      handleOpenEditInvoiceModal(completedInvoice);
                    }
                  }}
                  className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Edit customer details or change payment mode"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-400" />
                  Edit Bill / Mode
                </button>

                <button
                  onClick={() => {
                    try {
                      const doc = generateInvoicePDF(completedInvoice);
                      doc.autoPrint();
                      const blobUrl = doc.output("bloburl");
                      window.open(blobUrl, "_blank");
                    } catch (e) {
                      window.print();
                    }
                  }}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-100 border border-white/10 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>

                <button
                  onClick={() => {
                    const doc = generateInvoicePDF(completedInvoice);
                    doc.save(`Invoice_${completedInvoice.invoice_number}.pdf`);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>

              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Passed Invoice & Payment Mode Modal */}
      {showEditInvoiceModal && editingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-modal rounded-3xl max-w-lg w-full shadow-2xl border border-white/15 overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 border-b border-white/10 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Bill & Payment Mode</h3>
                  <p className="text-[11px] text-blue-300">
                    Invoice #{editingInvoice.invoice_number} • Total: ₹
                    {Number(editingInvoice.grand_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditInvoiceModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {editError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 flex items-center gap-2 font-bold animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Customer Name: <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-3 py-2 glass-input rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Customer Mobile: <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center glass-input rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20">
                    <span className="px-2.5 py-2 bg-white/10 text-slate-400 font-bold text-xs border-r border-white/10 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      placeholder="10-digit number"
                      maxLength={14}
                      className="w-full px-2.5 py-2 text-xs font-bold text-slate-100 outline-hidden bg-transparent placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Select Payment Mode:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPaymentMethod("cash");
                      setEditPaymentStatus("paid");
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      editPaymentMethod === "cash"
                        ? "bg-emerald-600/30 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Banknote className={`w-4 h-4 ${editPaymentMethod === "cash" ? "text-emerald-400" : "text-slate-400"}`} />
                      {editPaymentMethod === "cash" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span className="font-bold text-xs text-slate-100">Cash</span>
                    <span className="text-[10px] text-slate-400">Instant Paid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPaymentMethod("upi");
                      setEditPaymentStatus("paid");
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      editPaymentMethod === "upi"
                        ? "bg-blue-600/30 border-blue-500 text-white shadow-md shadow-blue-500/20"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Smartphone className={`w-4 h-4 ${editPaymentMethod === "upi" ? "text-blue-400" : "text-slate-400"}`} />
                      {editPaymentMethod === "upi" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <span className="font-bold text-xs text-slate-100">UPI / QR</span>
                    <span className="text-[10px] text-slate-400">GPay / PhonePe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPaymentMethod("khata");
                      setEditPaymentStatus("unpaid");
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      editPaymentMethod === "khata"
                        ? "bg-purple-600/30 border-purple-500 text-white shadow-md shadow-purple-500/20"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <BookOpen className={`w-4 h-4 ${editPaymentMethod === "khata" ? "text-purple-400" : "text-slate-400"}`} />
                      {editPaymentMethod === "khata" && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <span className="font-bold text-xs text-slate-100">Khata Credit</span>
                    <span className="text-[10px] text-purple-300">Track in Ledger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPaymentMethod("card");
                      setEditPaymentStatus("paid");
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      editPaymentMethod === "card"
                        ? "bg-amber-600/30 border-amber-500 text-white shadow-md shadow-amber-500/20"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CreditCard className={`w-4 h-4 ${editPaymentMethod === "card" ? "text-amber-400" : "text-slate-400"}`} />
                      {editPaymentMethod === "card" && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="font-bold text-xs text-slate-100">Card / POS</span>
                    <span className="text-[10px] text-slate-400">Card Swipe</span>
                  </button>
                </div>
              </div>

              {/* Payment Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                <div>
                  <span className="font-bold text-slate-200 block text-xs">Payment Settlement Status:</span>
                  <span className="text-[10px] text-slate-400">
                    {editPaymentStatus === "paid"
                      ? "Bill is fully received and settled."
                      : "Bill is unpaid and added as pending customer debt."}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditPaymentStatus("paid")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      editPaymentStatus === "paid" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    PAID
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentStatus("unpaid")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      editPaymentStatus === "unpaid" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    UNPAID / CREDIT
                  </button>
                </div>
              </div>

              {/* Note / Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Remark / Reason for Edit:
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Customer paid via Google Pay later, switched from cash..."
                  rows={2}
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs font-medium text-slate-100 placeholder:text-slate-500 resize-none"
                />
              </div>

              {/* Real-time Ledger Notice Alert */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Automatic Khata Synchronization:</strong> Changing payment mode between Khata Credit and Cash/UPI will automatically update the customer&apos;s Khata balance and ledger transaction entries.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditInvoiceModal(false)}
                disabled={isSavingInvoiceEdit}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveInvoiceEdit}
                disabled={isSavingInvoiceEdit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSavingInvoiceEdit ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Bill Updates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Reminder Modal for Saved Bills */}
      {whatsappModalBill && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-modal rounded-3xl max-w-md w-full shadow-2xl border border-white/10 overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-slate-800/40 border-b border-white/10 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Remind Customer on WhatsApp</h3>
                  <p className="text-[11px] text-emerald-300">Draft Bill #{whatsappModalBill.billNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModalBill(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Draft Info Card */}
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Customer:</span>
                  <span>{whatsappModalBill.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Items:</span>
                  <span>{whatsappModalBill.cart.length} Products</span>
                </div>
                <div className="flex justify-between text-slate-100 font-bold pt-1 border-t border-white/10">
                  <span>Total Payable:</span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    ₹{whatsappModalBill.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Customer WhatsApp Mobile Number:
                </label>
                <div className="flex items-center glass-input rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20">
                  <span className="px-3 py-2 bg-white/10 text-slate-300 font-bold text-xs border-r border-white/10 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={whatsappTargetPhone}
                    onChange={(e) => setWhatsappTargetPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    autoFocus
                    className="w-full px-3 py-2 text-xs font-bold text-slate-100 outline-hidden bg-transparent placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModalBill(null)}
                  className="w-1/3 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppReminder(whatsappModalBill, whatsappTargetPhone)}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send WhatsApp Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
