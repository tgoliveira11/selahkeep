import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rewrites credential login POST to the package start-form handler", async () => {
    const { middleware } = await import("@/middleware");
    const response = await middleware(
      new NextRequest("http://localhost:3001/login", { method: "POST" })
    );
    expect(response.headers.get("x-middleware-rewrite")).toContain("/api/auth/login/start-form");
    expect(getToken).not.toHaveBeenCalled();
  });

  it("rewrites credentials 2FA POST to the package verify-2fa-form handler", async () => {
    const { middleware } = await import("@/middleware");
    const response = await middleware(
      new NextRequest("http://localhost:3001/login/2fa", { method: "POST" })
    );
    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/api/auth/login/verify-2fa-form"
    );
    expect(getToken).not.toHaveBeenCalled();
  });
});

describe("middleware two-factor gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects pending 2FA sessions away from protected routes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { middleware } = await import("@/middleware");
    const response = await middleware(new NextRequest("http://localhost:3001/letters"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login/2fa");
  });

  it("allows pending 2FA sessions to reach login and auth routes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { middleware } = await import("@/middleware");
    const login = await middleware(new NextRequest("http://localhost:3001/login/2fa"));
    const api = await middleware(new NextRequest("http://localhost:3001/api/auth/login/verify-2fa-oauth"));
    expect(login.headers.get("location")).toBeNull();
    expect(api.headers.get("location")).toBeNull();
  });

  it("passes through verified sessions", async () => {
    getToken.mockResolvedValue({ twoFactorPending: false, twoFactorVerified: true });
    const { middleware } = await import("@/middleware");
    const response = await middleware(new NextRequest("http://localhost:3001/letters"));
    expect(response.headers.get("location")).toBeNull();
  });
});
