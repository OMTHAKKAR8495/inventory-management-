import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product, UserRole } from "./types";

export function exportToCSV(products: Product[], role: UserRole, filename = "inventory_export.csv") {
  const isAdmin = role === "admin";

  const rows = products.map((p) => {
    const baseRow: any = {
      "Product ID": p.id,
      "SKU": p.sku,
      "Product Name": p.name,
      "Category": p.category,
      "Sub-Category": p.sub_category || "",
      "Unit": p.unit,
      "Bulk Pack Size": p.bulk_pack_size,
      "Stock Quantity": p.stock_quantity,
      "Reorder Level": p.reorder_level,
      "Stock Status": p.status ? p.status.replace("_", " ").toUpperCase() : "IN STOCK",
      "Selling Price (₹)": p.selling_price.toFixed(2),
      "Supplier": p.supplier || "",
      "Expiry Date": p.expiry_date || "",
    };

    if (isAdmin) {
      baseRow["Cost Price (₹)"] = p.cost_price.toFixed(2);
      baseRow["Profit Margin (₹)"] = ((p.selling_price - p.cost_price)).toFixed(2);
      baseRow["Margin %"] = p.cost_price > 0 ? (((p.selling_price - p.cost_price) / p.cost_price) * 100).toFixed(1) + "%" : "0%";
      baseRow["Total Cost Value (₹)"] = (p.cost_price * p.stock_quantity).toFixed(2);
      baseRow["Total Sales Value (₹)"] = (p.selling_price * p.stock_quantity).toFixed(2);
    }

    return baseRow;
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF(
  products: Product[],
  role: UserRole,
  storeTitle = "Wholesale Provision Store",
  filterDescription = "All Current Items"
) {
  const isAdmin = role === "admin";
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Store Header
  doc.setFillColor(30, 58, 138); // Dark Royal Blue
  doc.rect(0, 0, 297, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(storeTitle.toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Official Inventory Stock Report | Scope: ${filterDescription}`, 14, 18);

  const dateStr = new Date().toLocaleString("en-IN");
  doc.text(`Generated: ${dateStr} | Access Level: ${role.toUpperCase()}`, 297 - 14, 18, { align: "right" });

  // Summary Metrics Banner
  let totalUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalCost = 0;
  let totalSales = 0;

  products.forEach((p) => {
    totalUnits += p.stock_quantity;
    if (p.stock_quantity <= 0) outOfStockCount++;
    else if (p.stock_quantity <= p.reorder_level) lowStockCount++;
    totalCost += p.cost_price * p.stock_quantity;
    totalSales += p.selling_price * p.stock_quantity;
  });

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 28, 269, 14, 2, 2, "F");

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");

  let summaryText = `Total Items: ${products.length}  |  Total Units: ${totalUnits.toLocaleString("en-IN")}  |  Low Stock: ${lowStockCount}  |  Out of Stock: ${outOfStockCount}`;
  if (isAdmin) {
    summaryText += `  |  Total Cost: Rs. ${totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Potential Sales: Rs. ${totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  doc.text(summaryText, 18, 37);

  // Table Columns
  const tableHeaders = [
    "SKU",
    "Product Name",
    "Category",
    "Unit",
    "Stock Qty",
    "Status",
    "Selling (Rs.)",
  ];

  if (isAdmin) {
    tableHeaders.push("Cost (Rs.)", "Margin (Rs.)", "Margin %", "Stock Value (Rs.)");
  }

  tableHeaders.push("Supplier", "Expiry");

  const tableData = products.map((p) => {
    let statusText = "In Stock";
    if (p.stock_quantity <= 0) statusText = "Out of Stock";
    else if (p.stock_quantity <= p.reorder_level) statusText = "Low Stock";

    const row = [
      p.sku,
      p.name,
      p.category,
      p.unit + (p.bulk_pack_size > 1 ? ` (${p.bulk_pack_size})` : ""),
      p.stock_quantity.toString(),
      statusText,
      `Rs. ${p.selling_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ];

    if (isAdmin) {
      const margin = p.selling_price - p.cost_price;
      const marginPct = p.cost_price > 0 ? ((margin / p.cost_price) * 100).toFixed(1) + "%" : "0%";
      const costVal = (p.cost_price * p.stock_quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 });

      row.push(
        `Rs. ${p.cost_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        `Rs. ${margin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        marginPct,
        `Rs. ${costVal}`
      );
    }

    row.push(p.supplier || "-", p.expiry_date || "-");
    return row;
  });

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 46,
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const text = data.cell.raw as string;
        if (text === "Out of Stock") {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        } else if (text === "Low Stock") {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [22, 101, 52];
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 14 },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, 297 / 2, 205, { align: "center" });
  }

  doc.save(`inventory_report_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function downloadSampleCSVTemplate() {
  const sampleData = [
    {
      "Product Name": "Basmati Long Grain Rice (25kg)",
      "Category": "Grains & Cereals",
      "Sub Category": "Rice",
      "Unit": "Bag",
      "Bulk Quantity": 1,
      "Cost Price": 1650.00,
      "Selling Price": 2100.00,
      "Stock Quantity": 80,
      "Reorder Level": 20,
      "Supplier": "Golden Harvest Mills",
      "Expiry Date": "2027-06-30",
    },
    {
      "Product Name": "Pure Mustard Oil (15L Tin)",
      "Category": "Edible Oils & Ghee",
      "Sub Category": "Cooking Oil",
      "Unit": "Tin",
      "Bulk Quantity": 1,
      "Cost Price": 1950.00,
      "Selling Price": 2350.00,
      "Stock Quantity": 45,
      "Reorder Level": 15,
      "Supplier": "Sunrich Edible Oils",
      "Expiry Date": "2026-12-31",
    },
    {
      "Product Name": "Cracked Wheat Porridge / Dalia (1kg x 20)",
      "Category": "Grains & Cereals",
      "Sub Category": "Cereals",
      "Unit": "Carton",
      "Bulk Quantity": 20,
      "Cost Price": 680.00,
      "Selling Price": 850.00,
      "Stock Quantity": 35,
      "Reorder Level": 10,
      "Supplier": "Agro Flour Mills",
      "Expiry Date": "2027-02-15",
    },
  ];

  const csv = Papa.unparse(sampleData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "wholesale_provision_inventory_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
