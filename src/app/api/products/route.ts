import { NextResponse } from "next/server";
import { queryAll, queryOne, execute, withTransaction } from "@/lib/cloudDb";
import { getCurrentUser } from "@/lib/auth";
import { Product, StockStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "all";
    const supplier = searchParams.get("supplier") || "";
    const minPrice = searchParams.get("min_price") ? parseFloat(searchParams.get("min_price")!) : null;
    const maxPrice = searchParams.get("max_price") ? parseFloat(searchParams.get("max_price")!) : null;
    const expiry = searchParams.get("expiry") || "all";
    const startDate = searchParams.get("start_date") || "";
    const endDate = searchParams.get("end_date") || "";
    const showTrash = searchParams.get("show_trash") === "true";
    const sortBy = searchParams.get("sort_by") || "updated_at";
    const sortOrder = (searchParams.get("sort_order")?.toUpperCase() === "ASC") ? "ASC" : "DESC";
    const isAll = searchParams.get("all") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));

    let query = `SELECT * FROM products WHERE 1=1`;
    const params: any[] = [];

    // Soft delete filter: show trash only if requested by Admin, else hide deleted
    if (showTrash && user.role === "admin") {
      query += ` AND deleted_at IS NOT NULL`;
    } else {
      query += ` AND deleted_at IS NULL`;
    }

    if (search) {
      query += ` AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(COALESCE(barcode, '')) LIKE ? OR LOWER(COALESCE(supplier, '')) LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category && category !== "all") {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (supplier && supplier !== "all") {
      query += ` AND supplier = ?`;
      params.push(supplier);
    }

    if (minPrice !== null && !isNaN(minPrice)) {
      query += ` AND selling_price >= ?`;
      params.push(minPrice);
    }

    if (maxPrice !== null && !isNaN(maxPrice)) {
      query += ` AND selling_price <= ?`;
      params.push(maxPrice);
    }

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= ?`;
      params.push(endDate + "T23:59:59.999Z");
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const todayStr = now.toISOString().split("T")[0];

    if (expiry === "expired") {
      query += ` AND expiry_date IS NOT NULL AND expiry_date < ?`;
      params.push(todayStr);
    } else if (expiry === "7days") {
      query += ` AND expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ?`;
      params.push(todayStr, in7Days);
    } else if (expiry === "30days") {
      query += ` AND expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ?`;
      params.push(todayStr, in30Days);
    }

    if (status === "out_of_stock") {
      query += ` AND stock_quantity <= 0`;
    } else if (status === "low_stock") {
      query += ` AND stock_quantity > 0 AND stock_quantity <= reorder_level`;
    } else if (status === "in_stock") {
      query += ` AND stock_quantity > reorder_level`;
    }

    const allowedSortCols: Record<string, string> = {
      name: "name",
      stock_quantity: "stock_quantity",
      selling_price: "selling_price",
      cost_price: "cost_price",
      updated_at: "updated_at",
      created_at: "created_at",
    };

    const sortColumn = allowedSortCols[sortBy] || "updated_at";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    const rawRows = await queryAll<Product>(query, params);

    // Compute status and margins in ₹
    const processedProducts: Product[] = rawRows.map((p) => {
      let stockStatus: StockStatus = "in_stock";
      if (p.stock_quantity <= 0) {
        stockStatus = "out_of_stock";
      } else if (p.stock_quantity <= p.reorder_level) {
        stockStatus = "low_stock";
      }

      const profit = Number((p.selling_price - p.cost_price).toFixed(2));
      const marginPct = p.cost_price > 0 ? Number(((profit / p.cost_price) * 100).toFixed(1)) : 0;
      const costVal = Number((p.cost_price * p.stock_quantity).toFixed(2));
      const salesVal = Number((p.selling_price * p.stock_quantity).toFixed(2));

      const isAdmin = user.role === "admin";

      return {
        ...p,
        status: stockStatus,
        cost_price: isAdmin ? p.cost_price : 0, // Strict backend masking
        profit_margin: isAdmin ? profit : undefined,
        profit_margin_percent: isAdmin ? marginPct : undefined,
        stock_cost_value: isAdmin ? costVal : undefined,
        stock_sales_value: salesVal,
      };
    });

    const totalCount = processedProducts.length;

    const catRows = await queryAll<{ category: string }>(
      "SELECT DISTINCT category FROM products WHERE deleted_at IS NULL ORDER BY category ASC"
    );
    const categories = catRows.map((row) => row.category);

    const suppRows = await queryAll<{ supplier: string }>(
      "SELECT DISTINCT supplier FROM products WHERE deleted_at IS NULL AND supplier IS NOT NULL AND supplier != '' ORDER BY supplier ASC"
    );
    const suppliers = suppRows.map((row) => row.supplier);

    if (isAll) {
      return NextResponse.json({
        products: processedProducts,
        total: totalCount,
        categories,
        suppliers,
      });
    }

    const startIndex = (page - 1) * limit;
    const paginatedProducts = processedProducts.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      products: paginatedProducts,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      categories,
      suppliers,
    });
  } catch (error: any) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      sku,
      barcode,
      name,
      category,
      sub_category,
      unit,
      bulk_pack_size,
      cost_price,
      selling_price,
      stock_quantity,
      reorder_level,
      supplier,
      expiry_date,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Product Name is required." }, { status: 400 });
    }
    if (!category || !category.trim()) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }
    if (!unit || !unit.trim()) {
      return NextResponse.json({ error: "Unit type is required." }, { status: 400 });
    }

    let finalSku = sku?.trim();
    if (!finalSku) {
      const prefix = category.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "PRD");
      finalSku = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const existingSku = await queryOne("SELECT id FROM products WHERE sku = ?", [finalSku]);
    if (existingSku) {
      return NextResponse.json(
        { error: `SKU '${finalSku}' already exists. Please provide a unique SKU or leave blank to auto-generate.` },
        { status: 400 }
      );
    }

    const newId = "prod_" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const initialQty = parseInt(stock_quantity || "0", 10);
    const costVal = parseFloat(cost_price || "0");
    const sellVal = parseFloat(selling_price || "0");

    await withTransaction(async (tx) => {
      await tx.execute(
        `INSERT INTO products (
          id, sku, barcode, name, category, sub_category, unit, bulk_pack_size,
          cost_price, selling_price, stock_quantity, reorder_level,
          supplier, expiry_date, deleted_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, NULL, ?, ?
        )`,
        [
          newId,
          finalSku,
          barcode?.trim() || null,
          name.trim(),
          category.trim(),
          sub_category?.trim() || null,
          unit.trim(),
          parseInt(bulk_pack_size || "1", 10) || 1,
          costVal,
          sellVal,
          initialQty,
          parseInt(reorder_level || "10", 10) || 10,
          supplier?.trim() || null,
          expiry_date || null,
          now,
          now,
        ]
      );

      await tx.execute(
        `INSERT INTO stock_logs (
          id, product_id, product_name, user_id, user_name,
          change_type, quantity_delta, previous_quantity, new_quantity, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "log_" + Math.random().toString(36).substring(2, 9),
          newId,
          name.trim(),
          user.id,
          user.name,
          "product_created",
          initialQty,
          0,
          initialQty,
          `Added new wholesale product by ${user.role}: ${name.trim()}`,
          now,
        ]
      );
    });

    const createdProduct = await queryOne("SELECT * FROM products WHERE id = ?", [newId]);

    return NextResponse.json({
      success: true,
      product: createdProduct,
      message: `Product '${name}' created successfully in Supabase.`,
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: error.message || "Failed to create product" }, { status: 500 });
  }
}

