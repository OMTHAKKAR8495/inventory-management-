import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/products/route";
import * as auth from "@/lib/auth";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

describe("GET & POST /api/products Integration Test", () => {
  const mockAdminUser: auth.User = {
    id: "usr_admin_test",
    name: "Store Admin",
    email: "admin@provision.store",
    role: "admin",
    status: "active",
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 Unauthorized when session is missing", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/products");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  it("should return catalog products and pagination metadata for authenticated user", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockAdminUser);

    const req = new Request("http://localhost:3000/api/products?page=1&limit=5");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.products)).toBe(true);
    expect(data.page).toBe(1);
    expect(typeof data.total).toBe("number");
  });

  it("should filter products by search query", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockAdminUser);

    const req = new Request("http://localhost:3000/api/products?search=Rice");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.products)).toBe(true);
    if (data.products.length > 0) {
      const match = data.products.some((p: any) =>
        p.name.toLowerCase().includes("rice") || p.sku.toLowerCase().includes("rice")
      );
      expect(match).toBe(true);
    }
  });

  it("should validate required fields when creating a new product via POST", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockAdminUser);

    const req = new Request("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Incomplete Product",
        // missing sku, cost_price, selling_price, unit, category
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
