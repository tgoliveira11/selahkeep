import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

describe("proxy admin path protection", () => {
  const originalAdminEnabled = process.env.AUTH_ADMIN_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_ADMIN_ENABLED = "true";
    vi.resetModules();
  });

  afterEach(() => {
    if (originalAdminEnabled === undefined) {
      delete process.env.AUTH_ADMIN_ENABLED;
    } else {
      process.env.AUTH_ADMIN_ENABLED = originalAdminEnabled;
    }
    vi.resetModules();
  });

  it("redirects unauthenticated users away from /admin", async () => {
    getToken.mockResolvedValue(null);
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/admin/users"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("callbackUrl=%2Fadmin%2Fusers");
  });

  it("allows fully authenticated users to reach /admin", async () => {
    getToken.mockResolvedValue({
      sub: "user-1",
      twoFactorPending: false,
      twoFactorVerified: true,
    });
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/admin"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not gate /admin when AUTH_ADMIN_ENABLED is false", async () => {
    process.env.AUTH_ADMIN_ENABLED = "false";
    vi.resetModules();
    getToken.mockResolvedValue(null);
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/admin"));
    expect(response.headers.get("location")).toBeNull();
  });
});
