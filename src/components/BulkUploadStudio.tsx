"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import confetti from "canvas-confetti";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Copy,
  Table,
  Eye,
  Save,
  Check,
  Sparkles,
} from "lucide-react";
import { User } from "@/lib/types";
import { downloadSampleCSVTemplate } from "@/lib/exportUtils";

interface BulkUploadStudioProps {
  user: User;
  onSuccessNavigateToInventory: () => void;
  existingCategories: string[];
}

interface GridProductRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  sub_category: string;
  unit: string;
  bulk_pack_size: number;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  supplier: string;
  expiry_date: string;
  isValid?: boolean;
  errors?: string[];
}

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

const COMMON_UNITS = ["Bag", "Sack", "Tin", "Carton", "Box", "Case", "Packet", "Bottle", "Can", "Kg", "Litre", "Piece"];

export const BulkUploadStudio: React.FC<BulkUploadStudioProps> = ({
  user,
  onSuccessNavigateToInventory,
  existingCategories,
}) => {
  const isAdmin = user.role === "admin";
  const [activeSubTab, setActiveSubTab] = useState<"file" | "grid">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<GridProductRow[]>([]);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    inserted: number;
    updated: number;
    failed: number;
    errors: any[];
  } | null>(null);

  // Manual Grid State
  const [gridRows, setGridRows] = useState<GridProductRow[]>([
    {
      id: "row_1",
      name: "",
      sku: "",
      category: "Grains & Cereals",
      sub_category: "",
      unit: "Bag",
      bulk_pack_size: 1,
      cost_price: 1500,
      selling_price: 1900,
      stock_quantity: 25,
      reorder_level: 10,
      supplier: "",
      expiry_date: "",
    },
    {
      id: "row_2",
      name: "",
      sku: "",
      category: "Edible Oils & Ghee",
      sub_category: "",
      unit: "Tin",
      bulk_pack_size: 1,
      cost_price: 1800,
      selling_price: 2200,
      stock_quantity: 20,
      reorder_level: 10,
      supplier: "",
      expiry_date: "",
    },
    {
      id: "row_3",
      name: "",
      sku: "",
      category: "Spices & Seasoning",
      sub_category: "",
      unit: "Carton",
      bulk_pack_size: 1,
      cost_price: 2400,
      selling_price: 3100,
      stock_quantity: 15,
      reorder_level: 10,
      supplier: "",
      expiry_date: "",
    },
  ]);
  const [isGridSubmitting, setIsGridSubmitting] = useState(false);
  const [gridErrorMsg, setGridErrorMsg] = useState("");

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories]));

  // Validation Helper
  const validateRow = (row: GridProductRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!row.name || !row.name.trim()) errors.push("Name missing");
    if (!row.category || !row.category.trim()) errors.push("Category missing");
    if (!row.unit || !row.unit.trim()) errors.push("Unit missing");
    if (row.selling_price < 0) errors.push("Negative selling price");
    if (isAdmin && row.cost_price < 0) errors.push("Negative cost price");
    if (row.stock_quantity < 0) errors.push("Negative stock quantity");
    return { isValid: errors.length === 0, errors };
  };

  // Handle File Drop / Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    processFile(droppedFile);
  };

  const processFile = (fileObj: File) => {
    setFile(fileObj);
    setIsProcessing(true);

    const ext = fileObj.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(fileObj, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          handleParsedData(results.data);
        },
        error: (err) => {
          alert("Error reading CSV: " + err.message);
          setIsProcessing(false);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          handleParsedData(json);
        } catch (err: any) {
          alert("Error parsing Excel file: " + err.message);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(fileObj);
    } else {
      alert("Please upload a .csv, .xlsx, or .xls file.");
      setIsProcessing(false);
    }
  };

  const handleParsedData = (rawRows: any[]) => {
    const converted: GridProductRow[] = rawRows.map((r, i) => {
      const name = r["Product Name"] || r["name"] || r["Product"] || r["Item Name"] || "";
      const sku = r["SKU"] || r["sku"] || r["Item Code"] || "";
      const category = r["Category"] || r["category"] || "General Provision";
      const subCategory = r["Sub Category"] || r["Sub-Category"] || r["sub_category"] || "";
      const unit = r["Unit"] || r["unit"] || r["Unit Type"] || "Piece";
      const bulkPackSize = parseInt(r["Bulk Quantity"] || r["Bulk Pack Size"] || r["bulk_pack_size"] || "1", 10) || 1;
      const costPrice = parseFloat(r["Cost Price"] || r["Cost Price (₹)"] || r["cost_price"] || r["Cost"] || "0") || 0;
      const sellingPrice = parseFloat(r["Selling Price"] || r["Selling Price (₹)"] || r["selling_price"] || r["Price"] || "0") || 0;
      const stockQuantity = parseInt(r["Stock Quantity"] || r["stock_quantity"] || r["Quantity"] || r["Qty"] || "0", 10) || 0;
      const reorderLevel = parseInt(r["Reorder Level"] || r["reorder_level"] || r["Threshold"] || "10", 10) || 10;
      const supplier = r["Supplier"] || r["supplier"] || r["Supplier Name"] || "";
      const expiryDate = r["Expiry Date"] || r["expiry_date"] || r["Expiry"] || "";

      const rowObj: GridProductRow = {
        id: `parsed_${i}_${Date.now()}`,
        name: String(name).trim(),
        sku: String(sku).trim(),
        category: String(category).trim(),
        sub_category: String(subCategory).trim(),
        unit: String(unit).trim(),
        bulk_pack_size: bulkPackSize,
        cost_price: costPrice,
        selling_price: sellingPrice,
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel,
        supplier: String(supplier).trim(),
        expiry_date: String(expiryDate).trim(),
      };

      const validation = validateRow(rowObj);
      return {
        ...rowObj,
        isValid: validation.isValid,
        errors: validation.errors,
      };
    });

    setParsedRows(converted);
    setIsProcessing(false);
    setUploadStep(2);
  };

  // Inline Cell Update in Preview Table
  const updateParsedRow = (index: number, field: keyof GridProductRow, value: any) => {
    const updated = [...parsedRows];
    updated[index] = { ...updated[index], [field]: value };
    const validation = validateRow(updated[index]);
    updated[index].isValid = validation.isValid;
    updated[index].errors = validation.errors;
    setParsedRows(updated);
  };

  const removeParsedRow = (index: number) => {
    setParsedRows(parsedRows.filter((_, i) => i !== index));
  };

  // Commit Parsed Rows to Database
  const commitParsedUpload = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("No valid rows to commit. Please fix errors first.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: validRows }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit upload");

      setUploadSummary({
        inserted: data.insertedCount || 0,
        updated: data.updatedCount || 0,
        failed: (data.errors?.length || 0) + (parsedRows.length - validRows.length),
        errors: data.errors || [],
      });

      setUploadStep(3);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      alert("Commit error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Grid Management
  const addGridRow = () => {
    setGridRows([
      ...gridRows,
      {
        id: `grid_${Date.now()}`,
        name: "",
        sku: "",
        category: "Grains & Cereals",
        sub_category: "",
        unit: "Bag",
        bulk_pack_size: 1,
        cost_price: 1000,
        selling_price: 1300,
        stock_quantity: 10,
        reorder_level: 10,
        supplier: "",
        expiry_date: "",
      },
    ]);
  };

  const updateGridRow = (index: number, field: keyof GridProductRow, value: any) => {
    const updated = [...gridRows];
    updated[index] = { ...updated[index], [field]: value };
    setGridRows(updated);
  };

  const duplicateGridRow = (index: number) => {
    const target = gridRows[index];
    const cloned = { ...target, id: `grid_${Date.now()}`, name: `${target.name} (Copy)` };
    setGridRows([...gridRows.slice(0, index + 1), cloned, ...gridRows.slice(index + 1)]);
  };

  const removeGridRow = (index: number) => {
    if (gridRows.length <= 1) return;
    setGridRows(gridRows.filter((_, i) => i !== index));
  };

  const saveManualGrid = async () => {
    const filledRows = gridRows.filter((r) => r.name.trim().length > 0);
    if (filledRows.length === 0) {
      setGridErrorMsg("Please enter at least one product with a name.");
      return;
    }

    setIsGridSubmitting(true);
    setGridErrorMsg("");

    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: filledRows }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save products");

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      alert(`Success! Added ${data.insertedCount || 0} and updated ${data.updatedCount || 0} products.`);
      onSuccessNavigateToInventory();
    } catch (err: any) {
      setGridErrorMsg(err.message || "Failed to save grid products");
    } finally {
      setIsGridSubmitting(false);
    }
  };

  const invalidParsedCount = parsedRows.filter((r) => !r.isValid).length;
  const validParsedCount = parsedRows.length - invalidParsedCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in text-slate-100">
      {/* Studio Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Fast Bulk Inventory Ingestion</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Bulk Add & Upload Studio</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Effortlessly ingest large wholesale shipments into the warehouse. Choose between uploading a spreadsheet file or entering products directly into the interactive spreadsheet table with Rupee (₹) pricing.
          </p>
        </div>

        {/* Subtab Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab("file")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === "file"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            File Upload (CSV/Excel)
          </button>
          <button
            onClick={() => setActiveSubTab("grid")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === "grid"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Table className="w-4 h-4" />
            Spreadsheet Grid Entry
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: FILE UPLOAD FLOW ===================== */}
      {activeSubTab === "file" && (
        <div className="space-y-6">
          {/* 3-Step Indicator */}
          <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-xl">
            <div className="flex items-center justify-around text-xs font-bold">
              <div className={`flex items-center gap-2 ${uploadStep >= 1 ? "text-blue-400" : "text-slate-500"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                  uploadStep >= 1 ? "bg-blue-600" : "bg-white/10"
                }`}>1</span>
                <span>1. Upload File</span>
              </div>
              <div className="w-12 h-0.5 bg-white/10 hidden sm:block" />
              <div className={`flex items-center gap-2 ${uploadStep >= 2 ? "text-blue-400" : "text-slate-500"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                  uploadStep >= 2 ? "bg-blue-600" : "bg-white/10"
                }`}>2</span>
                <span>2. Preview & Fix Errors</span>
              </div>
              <div className="w-12 h-0.5 bg-white/10 hidden sm:block" />
              <div className={`flex items-center gap-2 ${uploadStep >= 3 ? "text-emerald-400" : "text-slate-500"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                  uploadStep >= 3 ? "bg-emerald-600" : "bg-white/10"
                }`}>3</span>
                <span>3. Confirm & Ingest</span>
              </div>
            </div>
          </div>

          {/* Step 1: Upload Dropzone & Template Download */}
          {uploadStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Dropzone */}
              <div className="lg:col-span-2">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="glass-panel border-2 border-dashed border-white/20 hover:border-blue-400 rounded-3xl p-10 text-center cursor-pointer transition group shadow-2xl"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition shadow-lg shadow-blue-500/10">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Drag and drop your Inventory CSV or Excel file here
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Supports .CSV, .XLSX, and .XLS format. All columns are auto-mapped and validated instantly.
                  </p>
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Browse Local File
                  </button>
                </div>
              </div>

              {/* Template Download */}
              <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-white">
                  <Download className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold">Standard Template</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Download our pre-formatted wholesale template with pre-filled sample rows for Grains, Oils, Dal, and Spices in ₹.
                </p>

                <button
                  onClick={downloadSampleCSVTemplate}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>

                <div className="pt-3 border-t border-white/10">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase mb-2">Supported Columns:</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Product Name",
                      "Category",
                      "Sub Category",
                      "Unit",
                      "Bulk Quantity",
                      "Cost Price",
                      "Selling Price",
                      "Stock Quantity",
                      "Reorder Level",
                      "Supplier",
                      "Expiry Date",
                    ].map((col) => (
                      <span
                        key={col}
                        className="text-[10px] font-medium bg-white/5 text-slate-300 px-2 py-0.5 rounded-md border border-white/10"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Interactive Preview & Inline Correction Table */}
          {uploadStep === 2 && (
            <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      File Preview & Validation: <span className="text-blue-400">{file?.name}</span>
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                      {parsedRows.length} Rows Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review parsed data. Cells with errors are highlighted in red. You can edit values directly inside this table before saving.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setUploadStep(1);
                      setFile(null);
                      setParsedRows([]);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    Cancel / Pick Another File
                  </button>

                  <button
                    onClick={commitParsedUpload}
                    disabled={isProcessing || validParsedCount === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {isProcessing ? "Ingesting..." : `Confirm & Save ${validParsedCount} Items`}
                  </button>
                </div>
              </div>

              {invalidParsedCount > 0 ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong className="font-bold">{invalidParsedCount} row(s)</strong> have missing required fields. Edit them below or delete invalid rows.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>All <strong>{validParsedCount} products</strong> passed validation and are ready to save!</span>
                </div>
              )}

              {/* Editable Preview Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#090e1a]/90 backdrop-blur-md border-b border-white/10 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5 text-center w-10">#</th>
                      <th className="p-2.5 min-w-[200px]">Product Name *</th>
                      <th className="p-2.5 min-w-[130px]">Category *</th>
                      <th className="p-2.5 min-w-[90px]">Unit *</th>
                      <th className="p-2.5 min-w-[80px]">Pack Size</th>
                      {isAdmin && <th className="p-2.5 min-w-[90px]">Cost (₹)</th>}
                      <th className="p-2.5 min-w-[90px]">Selling (₹)</th>
                      <th className="p-2.5 min-w-[90px]">Stock Qty</th>
                      <th className="p-2.5 min-w-[90px]">Reorder</th>
                      <th className="p-2.5 min-w-[130px]">Supplier</th>
                      <th className="p-2.5 min-w-[120px]">Expiry</th>
                      <th className="p-2.5 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`transition ${
                          !row.isValid ? "bg-red-500/10 hover:bg-red-500/20" : "hover:bg-white/5"
                        }`}
                      >
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateParsedRow(idx, "name", e.target.value)}
                            placeholder="Enter product name"
                            className={`w-full px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                              !row.name.trim()
                                ? "border-red-400 bg-red-500/10 text-red-200 focus:ring-2 focus:ring-red-500/20"
                                : "glass-input text-white focus:border-blue-500"
                            } outline-hidden`}
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.category}
                            onChange={(e) => updateParsedRow(idx, "category", e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-white/10 text-xs bg-slate-900 text-slate-200 focus:border-blue-500 outline-hidden"
                          >
                            {allCategories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.unit}
                            onChange={(e) => updateParsedRow(idx, "unit", e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-white/10 text-xs bg-slate-900 text-slate-200 focus:border-blue-500 outline-hidden"
                          >
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={row.bulk_pack_size}
                            onChange={(e) => updateParsedRow(idx, "bulk_pack_size", parseInt(e.target.value, 10) || 1)}
                            className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs text-center focus:border-blue-500 outline-hidden"
                          />
                        </td>
                        {isAdmin && (
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.cost_price}
                              onChange={(e) => updateParsedRow(idx, "cost_price", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs font-mono font-bold focus:border-blue-500 outline-hidden"
                            />
                          </td>
                        )}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.selling_price}
                            onChange={(e) => updateParsedRow(idx, "selling_price", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded-lg glass-input text-emerald-400 text-xs font-mono font-bold focus:border-blue-500 outline-hidden"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            value={row.stock_quantity}
                            onChange={(e) => updateParsedRow(idx, "stock_quantity", parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs font-bold text-center focus:border-blue-500 outline-hidden"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={row.reorder_level}
                            onChange={(e) => updateParsedRow(idx, "reorder_level", parseInt(e.target.value, 10) || 10)}
                            className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs text-center focus:border-blue-500 outline-hidden"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.supplier}
                            onChange={(e) => updateParsedRow(idx, "supplier", e.target.value)}
                            placeholder="Supplier"
                            className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs focus:border-blue-500 outline-hidden"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={row.expiry_date}
                            onChange={(e) => updateParsedRow(idx, "expiry_date", e.target.value)}
                            className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs focus:border-blue-500 outline-hidden"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeParsedRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded-md transition cursor-pointer"
                            title="Remove Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Success Summary Banner */}
          {uploadStep === 3 && uploadSummary && (
            <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Bulk Ingestion Complete!</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Your warehouse inventory has been updated successfully in Indian Rupees (₹).
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-2xl font-black text-emerald-400">{uploadSummary.inserted}</div>
                  <span className="text-[11px] font-semibold text-emerald-300">New Products Added</span>
                </div>
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                  <div className="text-2xl font-black text-blue-400">{uploadSummary.updated}</div>
                  <span className="text-[11px] font-semibold text-blue-300">Stock Updated</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-black text-slate-400">{uploadSummary.failed}</div>
                  <span className="text-[11px] font-semibold text-slate-400">Skipped / Failed</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => {
                    setUploadStep(1);
                    setFile(null);
                    setParsedRows([]);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition cursor-pointer"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onSuccessNavigateToInventory}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition cursor-pointer"
                >
                  Go to Stock Catalog
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: MANUAL SPREADSHEET GRID ENTRY ===================== */}
      {activeSubTab === "grid" && (
        <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-400" />
                Spreadsheet-Style Grid Entry (₹)
              </h3>
              <p className="text-xs text-slate-400">
                Type directly into this interactive grid like Excel to quickly add multiple items at once with Rupee pricing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addGridRow}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                Add Row
              </button>

              <button
                type="button"
                onClick={saveManualGrid}
                disabled={isGridSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isGridSubmitting ? "Saving All..." : "Save All to Catalog"}
              </button>
            </div>
          </div>

          {gridErrorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {gridErrorMsg}
            </div>
          )}

          {/* Grid Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#090e1a]/90 backdrop-blur-md border-b border-white/10 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-2.5 text-center w-10">#</th>
                  <th className="p-2.5 min-w-[200px]">Product Name *</th>
                  <th className="p-2.5 min-w-[140px]">Category</th>
                  <th className="p-2.5 min-w-[100px]">Unit</th>
                  <th className="p-2.5 min-w-[80px]">Pack Size</th>
                  {isAdmin && <th className="p-2.5 min-w-[90px]">Cost (₹)</th>}
                  <th className="p-2.5 min-w-[90px]">Selling (₹)</th>
                  {isAdmin && <th className="p-2.5 min-w-[80px]">Margin (₹)</th>}
                  <th className="p-2.5 min-w-[90px]">Stock Qty</th>
                  <th className="p-2.5 min-w-[90px]">Reorder</th>
                  <th className="p-2.5 min-w-[130px]">Supplier</th>
                  <th className="p-2.5 min-w-[120px]">Expiry</th>
                  <th className="p-2.5 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {gridRows.map((row, idx) => {
                  const margin = row.selling_price - row.cost_price;
                  return (
                    <tr key={row.id} className="hover:bg-white/5 transition">
                      <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateGridRow(idx, "name", e.target.value)}
                          placeholder="e.g. Masoor Dal (25kg)"
                          className="w-full px-2.5 py-1 rounded-lg glass-input text-white text-xs font-semibold outline-hidden focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.category}
                          onChange={(e) => updateGridRow(idx, "category", e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-white/10 text-xs bg-slate-900 focus:border-blue-500 outline-hidden font-medium text-slate-200"
                        >
                          {allCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          value={row.unit}
                          onChange={(e) => updateGridRow(idx, "unit", e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-white/10 text-xs bg-slate-900 focus:border-blue-500 outline-hidden text-slate-200"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={row.bulk_pack_size}
                          onChange={(e) => updateGridRow(idx, "bulk_pack_size", parseInt(e.target.value, 10) || 1)}
                          className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs text-center focus:border-blue-500 outline-hidden"
                        />
                      </td>
                      {isAdmin && (
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.cost_price}
                            onChange={(e) => updateGridRow(idx, "cost_price", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs font-mono font-bold focus:border-blue-500 outline-hidden"
                          />
                        </td>
                      )}
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.selling_price}
                          onChange={(e) => updateGridRow(idx, "selling_price", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded-lg glass-input text-emerald-400 text-xs font-mono font-bold focus:border-blue-500 outline-hidden"
                        />
                      </td>
                      {isAdmin && (
                        <td className="p-2 text-center">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              margin >= 0 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
                            }`}
                          >
                            ₹{margin.toFixed(2)}
                          </span>
                        </td>
                      )}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={row.stock_quantity}
                          onChange={(e) => updateGridRow(idx, "stock_quantity", parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs font-bold text-center focus:border-blue-500 outline-hidden"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={row.reorder_level}
                          onChange={(e) => updateGridRow(idx, "reorder_level", parseInt(e.target.value, 10) || 10)}
                          className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs text-center focus:border-blue-500 outline-hidden"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.supplier}
                          onChange={(e) => updateGridRow(idx, "supplier", e.target.value)}
                          placeholder="Supplier Name"
                          className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs focus:border-blue-500 outline-hidden"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.expiry_date}
                          onChange={(e) => updateGridRow(idx, "expiry_date", e.target.value)}
                          className="w-full px-2 py-1 rounded-lg glass-input text-white text-xs focus:border-blue-500 outline-hidden"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateGridRow(idx)}
                            className="p-1 text-slate-400 hover:text-blue-400 rounded-md transition cursor-pointer"
                            title="Duplicate Row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGridRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded-md transition cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={addGridRow}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 py-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Another Row
            </button>
            <span className="text-xs text-slate-400">{gridRows.length} rows in spreadsheet</span>
          </div>
        </div>
      )}
    </div>
  );
};
