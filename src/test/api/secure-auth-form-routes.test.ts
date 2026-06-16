import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureSecureAuthDatabaseReady: vi.fn(),
  loginStartFormPost: vi.fn(),
  loginVerify2faFormPost: vi.fn(),
  loginCompletePost: vi.fn(),
}));

vi.mock("@/lib/secure-auth-schema", () => ({
  ensureSecureAuthDatabaseReady: mocks.ensureSecureAuthDatabaseReady,
}));

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      loginStartForm: { POST: mocks.loginStartFormPost },
      loginVerify2faForm: { POST: mocks.loginVerify2faFormPost },
      loginComplete: { POST: mocks.loginCompletePost },
    },
  },
}));

describe("secure-auth form login routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureSecureAuthDatabaseReady.mockResolvedValue(undefined);
  });

  it("delegates POST /api/auth/login/start-form to loginStartForm", async () => {
    const { POST } = await import("@/app/api/auth/login/start-form/route");
    mocks.loginStartFormPost.mockResolvedValue(Response.redirect("http://localhost/login/2fa", 303));
    const res = await POST(new Request("http://localhost/api/auth/login/start-form", { method: "POST" }));
    expect(mocks.loginStartFormPost).toHaveBeenCalledTimes(1);
    expect(res.status).toBeGreaterThanOrEqual(300);
  });

  it("delegates POST /api/auth/login/verify-2fa-form to loginVerify2faForm", async () => {
    const { POST } = await import("@/app/api/auth/login/verify-2fa-form/route");
    mocks.loginVerify2faFormPost.mockResolvedValue(
      Response.redirect("http://localhost/login/complete", 303)
    );
    const res = await POST(
      new Request("http://localhost/api/auth/login/verify-2fa-form", { method: "POST" })
    );
    expect(mocks.loginVerify2faFormPost).toHaveBeenCalledTimes(1);
    expect(res.status).toBeGreaterThanOrEqual(300);
  });

  it("delegates POST /api/auth/login/complete to loginComplete", async () => {
    const { POST } = await import("@/app/api/auth/login/complete/route");
    mocks.loginCompletePost.mockResolvedValue(
      new Response(JSON.stringify({ loginToken: "login-token-1234567890" }), { status: 200 })
    );
    const res = await POST(new Request("http://localhost/api/auth/login/complete", { method: "POST" }));
    expect(mocks.loginCompletePost).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });
});
