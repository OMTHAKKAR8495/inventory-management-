import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pos/checkout/route";
import * as auth from "@/lib/auth";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

describe("POST /api/pos/checkout Integration Test", () => {
  const mockAdminUser: auth.User = {
    id: "usr_admin_test",
    name: "Store Administrator",
    email: "admin@provision.store",
    role: "admin",
    status: "active",
    created_at: new Date().toISOString(),
  };

  const mockManagerUser: auth.User = {
    id: "usr_mgr_test",
    name: "Shopfloor Manager",
    email: "manager@provision.store",
    role: "manager",
    status: "active",
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is unauthenticated", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 when user is not admin (manager role)", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockManagerUser);

    const req = new Request("http://localhost:3000/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/restricted to Store Administrator/i);
  });

  it("should return 400 when cart items are missing or empty", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockAdminUser);

    const req = new Request("http://localhost:3000/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Walk-in Buyer",
        items: [],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/no items in billing cart/i);
  });

  it("should return 400 when customer name is missing", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockAdminUser);

    const req = new Request("http://localhost:3000/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "   ",
        items: [{ productId: "p_non_existent", quantity: 1 }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/customer name is required/i);
  });
});
