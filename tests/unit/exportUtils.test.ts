import { describe, it, expect, vi } from "vitest";
import { generateInvoicePDF, exportToCSV, downloadSampleCSVTemplate } from "@/lib/exportUtils";
import { Product } from "@/lib/types";

describe("Export & Reporting Utilities (src/lib/exportUtils.ts)", () => {
  const sampleProducts: Product[] = [
    {
      id: "prod_1",
      sku: "RICE-001",
      name: "Basmati Long Grain Rice 25kg",
      category: "Grains & Cereals",
      unit: "Bag",
      bulk_pack_size: 1,
      cost_price: 1500,
      selling_price: 1800,
      stock_quantity: 50,
      reorder_level: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "prod_2",
      sku: "OIL-001",
      name: "Pure Mustard Oil 15L",
      category: "Edible Oils",
      unit: "Tin",
      bulk_pack_size: 1,
      cost_price: 1800,
      selling_price: 2100,
      stock_quantity: 0,
      reorder_level: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const sampleInvoice = {
    invoice_number: "INV-2026-9901",
    customer_name: "Gupta General Store",
    payment_method: "cash",
    subtotal: 3900,
    discountAmount: 100,
    taxAmount: 190,
    taxPercent: 5,
    grand_total: 3990,
    items: [
      {
        product_name: "Basmati Long Grain Rice 25kg",
        sku: "RICE-001",
        quantity: 1,
        unit: "Bag",
        unit_price: 1800,
        total_price: 1800,
      },
      {
        product_name: "Pure Mustard Oil 15L",
        sku: "OIL-001",
        quantity: 1,
        unit: "Tin",
        unit_price: 2100,
        total_price: 2100,
      },
    ],
  };

  describe("generateInvoicePDF", () => {
    it("should generate a valid jsPDF document instance for invoice", () => {
      const doc = generateInvoicePDF(sampleInvoice);

      expect(doc).toBeDefined();
      expect(typeof doc.save).toBe("function");
      expect(typeof doc.output).toBe("function");

      const pdfData = doc.output("datauristring");
      expect(pdfData.startsWith("data:application/pdf")).toBe(true);
    });

    it("should handle invoices without discounts or customer names gracefully", () => {
      const minimalInvoice = {
        invoice_number: "INV-TEST-000",
        customer_name: "",
        payment_method: "upi",
        subtotal: 500,
        discountAmount: 0,
        taxAmount: 0,
        taxPercent: 0,
        grand_total: 500,
        items: [],
      };

      const doc = generateInvoicePDF(minimalInvoice);
      expect(doc).toBeDefined();
    });
  });

  describe("CSV Export Helpers", () => {
    it("should invoke DOM download mechanism for exportToCSV", () => {
      // Mock DOM Blob and link clicking
      const clickMock = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
      const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
      const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
        const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag);
        el.click = clickMock;
        return el;
      });
      global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
      global.URL.revokeObjectURL = vi.fn();

      exportToCSV(sampleProducts, "admin", "test_inventory.csv");

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      // Clean up spies
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createElementSpy.mockRestore();
    });

    it("should trigger download for sample CSV template", () => {
      const clickMock = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
      const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
      const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
        const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag);
        el.click = clickMock;
        return el;
      });
      global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
      global.URL.revokeObjectURL = vi.fn();

      downloadSampleCSVTemplate();

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(clickMock).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createElementSpy.mockRestore();
    });
  });
});
