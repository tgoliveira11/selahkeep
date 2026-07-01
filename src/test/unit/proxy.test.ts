import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rewrites credential login POST to the package start-form handler", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3001/login", { method: "POST" })
    );
    expect(response.headers.get("x-middleware-rewrite")).toContain("/api/auth/login/start-form");
    expect(getToken).not.toHaveBeenCalled();
  });

  it("rewrites credentials 2FA POST to the package verify-2fa-form handler", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3001/login/2fa", { method: "POST" })
    );
    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/api/auth/login/verify-2fa-form"
    );
    expect(getToken).not.toHaveBeenCalled();
  });
});

describe("proxy two-factor gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects pending 2FA sessions away from protected routes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/notes"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login/2fa");
    expect(response.headers.get("location")).toContain("callbackUrl=%2Fnotes");
  });

  it("preserves safe callbackUrl when redirecting from vault settings", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3001/vault/settings?tab=security")
    );
    expect(response.headers.get("location")).toContain("/login/2fa");
    expect(response.headers.get("location")).toContain(
      "callbackUrl=%2Fvault%2Fsettings%3Ftab%3Dsecurity"
    );
  });

  it("sanitizes unsafe callback targets to /notes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/login/2fa"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects pending 2FA away from login loop paths with safe default callback", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/notes/new"));
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("callbackUrl=");
    expect(location).not.toContain("callbackUrl=%2Flogin");
  });

  it("allows pending 2FA sessions to reach login and auth routes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { proxy } = await import("@/proxy");
    const login = await proxy(new NextRequest("http://localhost:3001/login/2fa"));
    const api = await proxy(new NextRequest("http://localhost:3001/api/auth/login/verify-2fa-oauth"));
    expect(login.headers.get("location")).toBeNull();
    expect(api.headers.get("location")).toBeNull();
  });

  it("passes through verified sessions", async () => {
    getToken.mockResolvedValue({ twoFactorPending: false, twoFactorVerified: true });
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/notes"));
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy authenticated guest-page redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects fully authenticated users away from /login", async () => {
    getToken.mockResolvedValue({
      sub: "user-1",
      twoFactorPending: false,
      twoFactorVerified: true,
    });
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/login"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/home");
  });

  it("redirects fully authenticated users away from /register and /forgot-password", async () => {
    getToken.mockResolvedValue({
      sub: "user-1",
      twoFactorPending: false,
      twoFactorVerified: true,
    });
    const { proxy } = await import("@/proxy");

    const register = await proxy(new NextRequest("http://localhost:3001/register"));
    expect(register.headers.get("location")).toContain("/home");

    const forgot = await proxy(new NextRequest("http://localhost:3001/forgot-password"));
    expect(forgot.headers.get("location")).toContain("/home");
  });

  it("does not redirect unauthenticated users from guest pages", async () => {
    getToken.mockResolvedValue(null);
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/login"));
    expect(response.headers.get("location")).toBeNull();
  });
});
