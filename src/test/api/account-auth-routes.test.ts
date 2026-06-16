import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  forgotPasswordPost: vi.fn(),
  verifyEmailConfirmPost: vi.fn(),
  resetPasswordPost: vi.fn(),
  changePasswordPost: vi.fn(),
  verifyEmailResendPost: vi.fn(),
  accountAuthStatusGet: vi.fn(),
}));

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      forgotPassword: { POST: mocks.forgotPasswordPost },
      verifyEmailConfirm: { POST: mocks.verifyEmailConfirmPost },
      resetPassword: { POST: mocks.resetPasswordPost },
      changePassword: { POST: mocks.changePasswordPost },
      verifyEmailResend: { POST: mocks.verifyEmailResendPost },
      accountAuthStatus: { GET: mocks.accountAuthStatusGet },
    },
  },
}));

describe("account auth API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/auth/forgot-password delegates to secure-auth", async () => {
    mocks.forgotPasswordPost.mockResolvedValue(
      new Response(JSON.stringify({ message: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "ok" });
    expect(mocks.forgotPasswordPost).toHaveBeenCalledTimes(1);
  });

  it("POST /api/auth/verify-email/confirm delegates to secure-auth", async () => {
    mocks.verifyEmailConfirmPost.mockResolvedValue(
      new Response(JSON.stringify({ verified: true }), { status: 200 })
    );
    const { POST } = await import("@/app/api/auth/verify-email/confirm/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true });
  });

  it("POST /api/account/change-password delegates to secure-auth", async () => {
    mocks.changePasswordPost.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    const { POST } = await import("@/app/api/account/change-password/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("GET /api/account/auth-status delegates to secure-auth", async () => {
    mocks.accountAuthStatusGet.mockResolvedValue(
      new Response(JSON.stringify({ emailVerified: false }), { status: 200 })
    );
    const { GET } = await import("@/app/api/account/auth-status/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emailVerified: false });
  });
});
