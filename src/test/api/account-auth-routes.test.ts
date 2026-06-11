import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  confirmEmailVerification: vi.fn(),
  resetPassword: vi.fn(),
  validatePasswordResetToken: vi.fn(),
  changePassword: vi.fn(),
  resendVerificationByEmail: vi.fn(),
  sendVerificationEmailForUser: vi.fn(),
  getAccountAuthStatus: vi.fn(),
  requireSessionUser: vi.fn(),
  requireFullyAuthenticatedUser: vi.fn(),
}));

vi.mock("@/server/services/account-auth-service", () => ({
  accountAuthService: {
    requestPasswordReset: mocks.requestPasswordReset,
    confirmEmailVerification: mocks.confirmEmailVerification,
    resetPassword: mocks.resetPassword,
    validatePasswordResetToken: mocks.validatePasswordResetToken,
    changePassword: mocks.changePassword,
    resendVerificationByEmail: mocks.resendVerificationByEmail,
    sendVerificationEmailForUser: mocks.sendVerificationEmailForUser,
    getAccountAuthStatus: mocks.getAccountAuthStatus,
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

describe("account auth API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440000" });
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("POST /api/auth/forgot-password rejects invalid email", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/forgot-password returns generic message", async () => {
    mocks.requestPasswordReset.mockResolvedValue({
      message: "If an account exists for this email, we'll send password reset instructions.",
    });
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "If an account exists for this email, we'll send password reset instructions.",
    });
  });

  it("POST /api/auth/verify-email/confirm rejects invalid body", async () => {
    const { POST } = await import("@/app/api/auth/verify-email/confirm/route");
    const res = await POST(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) })
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/verify-email/confirm maps validation failures", async () => {
    const { ValidationError } = await import("@/server/services/account-service");
    mocks.confirmEmailVerification.mockRejectedValue(
      new ValidationError("This verification link is invalid or expired.")
    );
    const { POST } = await import("@/app/api/auth/verify-email/confirm/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "bad" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/verify-email/confirm verifies token", async () => {
    mocks.confirmEmailVerification.mockResolvedValue({ verified: true, email: "user@example.com" });
    const { POST } = await import("@/app/api/auth/verify-email/confirm/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "abc" }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/reset-password rejects password transport violations", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const res = await POST(
      new Request("http://localhost/api/auth/reset-password?password=secret", {
        method: "POST",
        body: JSON.stringify({
          action: "reset",
          token: "abc",
          newPassword: "long-enough-password",
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/reset-password rejects invalid body", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "reset", token: "abc" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/reset-password validates and resets", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    mocks.validatePasswordResetToken.mockResolvedValue({ valid: false });
    const invalidRes = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "validate", token: "bad" }),
      })
    );
    expect((await invalidRes.json()).valid).toBe(false);

    mocks.validatePasswordResetToken.mockResolvedValue({ valid: true });
    const validateRes = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "validate", token: "abc" }),
      })
    );
    expect(validateRes.status).toBe(200);

    const { ValidationError } = await import("@/server/services/account-service");
    mocks.resetPassword.mockRejectedValue(new ValidationError("expired"));
    const badReset = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          action: "reset",
          token: "abc",
          newPassword: "long-enough-password",
        }),
      })
    );
    expect(badReset.status).toBe(400);

    mocks.resetPassword.mockResolvedValue({ success: true });
    const resetRes = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          action: "reset",
          token: "abc",
          newPassword: "long-enough-password",
        }),
      })
    );
    expect(resetRes.status).toBe(200);
  });

  it("POST /api/account/change-password rejects password transport violations", async () => {
    const { POST } = await import("@/app/api/account/change-password/route");
    const res = await POST(
      new Request("http://localhost/api/account/change-password?password=secret", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: "old-password",
          newPassword: "long-enough-password",
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/account/change-password rejects invalid body", async () => {
    const { POST } = await import("@/app/api/account/change-password/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ currentPassword: "x" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/account/change-password maps reauthentication failures", async () => {
    const { ReauthenticationRequiredError } = await import("@/server/services/account-service");
    mocks.changePassword.mockRejectedValue(new ReauthenticationRequiredError("Incorrect password"));
    const { POST } = await import("@/app/api/account/change-password/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: "wrong",
          newPassword: "long-enough-password",
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/account/change-password updates password", async () => {
    mocks.changePassword.mockResolvedValue({ success: true });
    const { POST } = await import("@/app/api/account/change-password/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: "old-password",
          newPassword: "long-enough-password",
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/verify-email/resend reports already verified", async () => {
    mocks.sendVerificationEmailForUser.mockResolvedValue({ alreadyVerified: true });
    const { POST } = await import("@/app/api/auth/verify-email/resend/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect((await res.json()).message).toContain("already verified");
  });

  it("POST /api/auth/verify-email/resend works for authenticated users", async () => {
    mocks.sendVerificationEmailForUser.mockResolvedValue({ alreadyVerified: false });
    const { POST } = await import("@/app/api/auth/verify-email/resend/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/verify-email/resend rejects invalid email body", async () => {
    const { POST } = await import("@/app/api/auth/verify-email/resend/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-email" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.resendVerificationByEmail).not.toHaveBeenCalled();
  });

  it("POST /api/auth/verify-email/resend works with email body", async () => {
    mocks.resendVerificationByEmail.mockResolvedValue({ message: "sent" });
    const { POST } = await import("@/app/api/auth/verify-email/resend/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/account/auth-status surfaces not found errors", async () => {
    const { NotFoundError } = await import("@/server/services/account-service");
    mocks.getAccountAuthStatus.mockRejectedValue(new NotFoundError("Account not found"));
    const { GET } = await import("@/app/api/account/auth-status/route");
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("GET /api/account/auth-status returns account auth status", async () => {
    mocks.getAccountAuthStatus.mockResolvedValue({
      email: "user@example.com",
      emailVerified: false,
      canChangePassword: true,
      hasPassword: true,
      authProvider: "credentials",
    });
    const { GET } = await import("@/app/api/account/auth-status/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
