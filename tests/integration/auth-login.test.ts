import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";

describe("POST /api/auth/login Integration Test", () => {
  it("should return 400 when email or password is missing", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@provision.store" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email and password are required/i);
  });

  it("should return 401 when invalid password is provided", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "ashastore@gmail.com",
        password: "incorrect_password_xyz",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid credentials/i);
  });

  it("should successfully authenticate with valid demo credentials", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "ashastore@gmail.com",
        password: "9558413347@Om",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe("ashastore@gmail.com");
    expect(data.user.role).toBe("admin");

    // Verify Set-Cookie header contains auth token
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("provision_auth_token");
  });
});
