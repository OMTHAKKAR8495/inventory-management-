import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  signToken,
  verifyToken,
  invalidateUserCache,
  setAuthCookie,
  clearAuthCookie,
  TokenPayload,
} from "@/lib/auth";

describe("Authentication Service (src/lib/auth.ts)", () => {
  const samplePayload: TokenPayload = {
    userId: "user_test_123",
    email: "admin@wholesale.com",
    role: "admin",
    name: "Om Thakkar",
  };

  beforeEach(() => {
    invalidateUserCache();
    vi.clearAllMocks();
  });

  describe("signToken & verifyToken", () => {
    it("should sign a valid JWT and successfully verify it with all claims", async () => {
      const token = await signToken(samplePayload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // Header.Payload.Signature

      const decoded = await verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(samplePayload.userId);
      expect(decoded?.email).toBe(samplePayload.email);
      expect(decoded?.role).toBe(samplePayload.role);
      expect(decoded?.name).toBe(samplePayload.name);
    });

    it("should return null for malformed or tampered tokens", async () => {
      const token = await signToken(samplePayload);
      const tampered = token.slice(0, -5) + "abcde";

      const result = await verifyToken(tampered);
      expect(result).toBeNull();

      const invalidStringResult = await verifyToken("not.a.valid.jwt.token");
      expect(invalidStringResult).toBeNull();
    });

    it("should return null for empty token string", async () => {
      const result = await verifyToken("");
      expect(result).toBeNull();
    });
  });

  describe("Cookie Helpers", () => {
    it("should generate correct auth cookie attributes on setAuthCookie", () => {
      const testToken = "mock_jwt_token_string";
      const cookie = setAuthCookie(testToken);

      expect(cookie.name).toBe("provision_auth_token");
      expect(cookie.value).toBe(testToken);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.path).toBe("/");
      expect(cookie.sameSite).toBe("lax");
      expect(cookie.maxAge).toBe(60 * 60 * 24 * 7); // 7 days in seconds
    });

    it("should generate expiration cookie attributes on clearAuthCookie", () => {
      const cookie = clearAuthCookie();

      expect(cookie.name).toBe("provision_auth_token");
      expect(cookie.value).toBe("");
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.maxAge).toBe(0);
      expect(cookie.path).toBe("/");
    });
  });

  describe("invalidateUserCache", () => {
    it("should clear specific user or all user caches without throwing", () => {
      expect(() => invalidateUserCache("user_test_123")).not.toThrow();
      expect(() => invalidateUserCache()).not.toThrow();
    });
  });
});
