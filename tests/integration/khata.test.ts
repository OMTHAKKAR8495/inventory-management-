import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE } from "@/app/api/khata/route";
import * as auth from "@/lib/auth";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

describe("API /api/khata Integration Tests", () => {
  const mockUser: auth.User = {
    id: "usr_test_user",
    name: "Om Cashier",
    email: "cashier@provision.store",
    role: "manager",
    status: "active",
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/khata", () => {
    it("should return 401 when unauthorized", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/khata");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return customer list and total receivables for authenticated user", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockUser);

      const req = new Request("http://localhost:3000/api/khata");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.customers)).toBe(true);
      expect(typeof data.totalReceivable).toBe("number");
      expect(typeof data.activeCount).toBe("number");
    });
  });

  describe("POST /api/khata (create_customer, record_payment)", () => {
    it("should validate required fields when creating customer", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(mockUser);

      const req = new Request("http://localhost:3000/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_customer",
          name: "Ramesh Bhai",
          // missing storeName and phone
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/name, store name, and phone are required/i);
    });

    it("should create new customer and delete it via DELETE endpoint", async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockUser);

      const testPhone = `+91 99999 ${Math.floor(10000 + Math.random() * 90000)}`;
      const createReq = new Request("http://localhost:3000/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_customer",
          name: "Test Customer",
          storeName: "Test Kirana Provision",
          phone: testPhone,
          creditLimit: 30000,
          initialBalance: 500,
        }),
      });

      const createRes = await POST(createReq);
      expect(createRes.status).toBe(200);
      const createData = await createRes.json();
      expect(createData.success).toBe(true);

      // Verify customer exists in GET list
      const listReq = new Request("http://localhost:3000/api/khata");
      const listRes = await GET(listReq);
      const listData = await listRes.json();
      const createdCust = listData.customers.find((c: any) => c.phone === testPhone);
      expect(createdCust).toBeDefined();

      // Test DELETE endpoint
      const deleteReq = new Request(`http://localhost:3000/api/khata?customerId=${createdCust.id}`, {
        method: "DELETE",
      });
      const deleteRes = await DELETE(deleteReq);
      expect(deleteRes.status).toBe(200);
      const deleteData = await deleteRes.json();
      expect(deleteData.success).toBe(true);
    });
  });
});
