"use client";

import React, { useState, useEffect } from "react";
import { X, Package, Calculator, Check, AlertCircle } from "lucide-react";
import { Product, User } from "@/lib/types";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSave: (productData: any) => Promise<boolean>;
  user: User;
  existingCategories: string[];
  existingSuppliers: string[];
}

const COMMON_UNITS = [
  "Bag",
  "Sack",
  "Tin",
  "Carton",
  "Box",
  "Case",
  "Packet",
  "Bottle",
  "Can",
  "Kg",
  "Litre",
  "Piece",
];

const DEFAULT_CATEGORIES = [
  "Grains & Cereals",
  "Pulses & Lentils",
  "Edible Oils & Ghee",
  "Spices & Seasoning",
  "Beverages & Tea",
  "Snacks & Packaged Goods",
  "Cleaning & Household",
  "Personal Care & Toiletries",
  "Dairy & Bakery",
  "General Provision",
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSave,
  user,
  existingCategories,
  existingSuppliers,
}) => {
  const isAdmin = user.role === "admin";

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [unit, setUnit] = useState(COMMON_UNITS[0]);
  const [customUnit, setCustomUnit] = useState("");
  const [bulkPackSize, setBulkPackSize] = useState("1");
  const [costPrice, setCostPrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [supplier, setSupplier] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories]));

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setSku(productToEdit.sku || "");
      setCategory(productToEdit.category || DEFAULT_CATEGORIES[0]);
      setSubCategory(productToEdit.sub_category || "");
      setUnit(productToEdit.unit || COMMON_UNITS[0]);
      setBulkPackSize(productToEdit.bulk_pack_size?.toString() || "1");
      setCostPrice(productToEdit.cost_price?.toString() || "0");
      setSellingPrice(productToEdit.selling_price?.toString() || "0");
      setStockQuantity(productToEdit.stock_quantity?.toString() || "0");
      setReorderLevel(productToEdit.reorder_level?.toString() || "10");
      setSupplier(productToEdit.supplier || "");
      setExpiryDate(productToEdit.expiry_date || "");
    } else {
      setName("");
      setSku("");
      setCategory(DEFAULT_CATEGORIES[0]);
      setSubCategory("");
      setUnit(COMMON_UNITS[0]);
      setBulkPackSize("1");
      setCostPrice("0");
      setSellingPrice("0");
      setStockQuantity("0");
      setReorderLevel("10");
      setSupplier("");
      setExpiryDate("");
    }
    setErrorMsg("");
  }, [productToEdit, isOpen]);

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

  const costNum = parseFloat(costPrice) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const profitMargin = Number((sellNum - costNum).toFixed(2));
  const profitMarginPct = costNum > 0 ? Number(((profitMargin / costNum) * 100).toFixed(1)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Product name is mandatory.");
      return;
    }

    const finalCategory = category === "__custom__" ? customCategory.trim() : category;
    const finalUnit = unit === "__custom__" ? customUnit.trim() : unit;

    if (!finalCategory) {
      setErrorMsg("Category is mandatory.");
      return;
    }

    if (!finalUnit) {
      setErrorMsg("Unit type is mandatory.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const payload = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      category: finalCategory,
      sub_category: subCategory.trim() || undefined,
      unit: finalUnit,
      bulk_pack_size: parseInt(bulkPackSize, 10) || 1,
      cost_price: parseFloat(costPrice) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      stock_quantity: parseInt(stockQuantity, 10) || 0,
      reorder_level: parseInt(reorderLevel, 10) || 10,
      supplier: supplier.trim() || undefined,
      expiry_date: expiryDate || null,
    };

    const success = await onSave(payload);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {productToEdit ? "Edit Wholesale Product" : "Add New Provision Product"}
              </h3>
              <p className="text-xs text-blue-200">
                {productToEdit ? `Updating ${productToEdit.sku}` : "Enter product specifications, wholesale pricing & initial stock in ₹"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Row 1: Name & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Basmati Rice (25kg Bag)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                SKU / Barcode <span className="text-slate-400 font-normal">(Auto if blank)</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. GRN-BAS-25"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-mono uppercase text-slate-900"
              />
            </div>
          </div>

          {/* Row 2: Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden bg-white text-slate-900 font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">+ Add Custom Category...</option>
              </select>
              {category === "__custom__" && (
                <input
                  type="text"
                  placeholder="Enter new category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2 text-xs rounded-xl border border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-hidden"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sub-Category <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g. Rice, Flour, Dal, Cooking Oil"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden text-slate-900"
              />
            </div>
          </div>

          {/* Row 3: Unit Type & Bulk Pack Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unit Type <span className="text-red-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden bg-white text-slate-900 font-medium"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="__custom__">+ Custom Unit...</option>
              </select>
              {unit === "__custom__" && (
                <input
                  type="text"
                  placeholder="e.g. Bundle, Drum"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2 text-xs rounded-xl border border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-hidden"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bulk Pack / Multiplier Size
              </label>
              <input
                type="number"
                min="1"
                value={bulkPackSize}
                onChange={(e) => setBulkPackSize(e.target.value)}
                placeholder="e.g. 24 units per carton"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden text-slate-900"
              />
            </div>
          </div>

          {/* Row 4: Pricing & Live Margin Widget (Rupee ₹) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                Wholesale Pricing & Margins (₹)
              </span>
              {isAdmin && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    profitMargin >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  Margin: ₹{profitMargin.toLocaleString("en-IN")} ({profitMarginPct}%)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cost Price (₹ per unit) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-mono font-bold text-slate-900"
                  />
                </div>
              )}

              <div className={isAdmin ? "" : "sm:col-span-2"}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selling Price (₹ per unit) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-mono font-bold text-blue-700"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Stock Quantities & Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Low Stock Threshold (Reorder Level)
              </label>
              <input
                type="number"
                min="1"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Row 6: Supplier & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                list="suppliersList"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Golden Harvest Millers"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden text-slate-900 font-medium"
              />
              <datalist id="suppliersList">
                {existingSuppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expiry Date <span className="text-slate-400 font-normal">(Provision Goods)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden text-slate-900"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? "Saving..." : productToEdit ? "Update Product" : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
