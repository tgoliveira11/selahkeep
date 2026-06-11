import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountAuthService } from "@/server/services/account-auth-service";
import { USER_ID } from "@/test/helpers/fixtures";
import { createOpaqueToken } from "@/server/policies/login-token";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  markEmailVerified: vi.fn(),
  updatePassword: vi.fn(),
  createToken: vi.fn(),
  consumeValidToken: vi.fn(),
  findValidToken: vi.fn(),
  revokeActiveTokensForUser: vi.fn(),
  record: vi.fn(),
  sendEmail: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  enforceRateLimit: vi.fn(),
  runInTransaction: vi.fn(),
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: {
    findById: mocks.findById,
    findByEmail: mocks.findByEmail,
    markEmailVerified: mocks.markEmailVerified,
    updatePassword: mocks.updatePassword,
  },
}));

vi.mock("@/server/repositories/account-token-repository", () => ({
  accountTokenRepository: {
    create: mocks.createToken,
    consumeValidToken: mocks.consumeValidToken,
    findValidToken: mocks.findValidToken,
    revokeActiveTokensForUser: mocks.revokeActiveTokensForUser,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

vi.mock("@/server/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@/server/policies/password-hashing", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("@/server/policies/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: mocks.runInTransaction,
}));

const credentialsUser = {
  id: USER_ID,
  email: "user@example.com",
  authProvider: "credentials",
  passwordHash: "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  emailVerifiedAt: null,
  passwordUpdatedAt: null,
};

describe("accountAuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.hashPassword.mockResolvedValue("new-hash");
    mocks.runInTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  });

  it("throws when verification resend target is missing", async () => {
    mocks.findById.mockResolvedValue(null);
    await expect(accountAuthService.sendVerificationEmailForUser(USER_ID)).rejects.toThrow(
      "not found"
    );
  });

  it("sends verification email for unverified credentials users", async () => {
    mocks.findById.mockResolvedValue(credentialsUser);
    const result = await accountAuthService.sendVerificationEmailForUser(USER_ID);
    expect(result.alreadyVerified).toBe(false);
    expect(mocks.sendEmail).toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(
      "email_verification_requested",
      USER_ID,
      expect.any(Object)
    );
  });

  it("confirms email verification once", async () => {
    const token = createOpaqueToken();
    mocks.consumeValidToken.mockResolvedValue({ userId: USER_ID });
    mocks.findById.mockResolvedValue(credentialsUser);
    mocks.markEmailVerified.mockResolvedValue({ ...credentialsUser, emailVerifiedAt: new Date() });

    const result = await accountAuthService.confirmEmailVerification(token);
    expect(result.verified).toBe(true);
    expect(mocks.markEmailVerified).toHaveBeenCalledWith(USER_ID);
  });

  it("rejects verification when user record disappears", async () => {
    mocks.consumeValidToken.mockResolvedValue({ userId: USER_ID });
    mocks.findById.mockResolvedValue(null);
    await expect(accountAuthService.confirmEmailVerification(createOpaqueToken())).rejects.toThrow(
      "invalid or expired"
    );
  });

  it("rejects reused verification tokens", async () => {
    mocks.consumeValidToken.mockResolvedValue(null);
    await expect(accountAuthService.confirmEmailVerification(createOpaqueToken())).rejects.toThrow(
      "invalid or expired"
    );
  });

  it("returns generic forgot-password response", async () => {
    mocks.findByEmail.mockResolvedValue(credentialsUser);
    const result = await accountAuthService.requestPasswordReset("user@example.com");
    expect(result.message).toContain("If an account exists");
    expect(mocks.sendEmail).toHaveBeenCalled();
  });

  it("does not send reset email for oauth-only accounts", async () => {
    mocks.findByEmail.mockResolvedValue({
      ...credentialsUser,
      authProvider: "google",
      passwordHash: null,
    });
    await accountAuthService.requestPasswordReset("user@example.com");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not reveal missing accounts on forgot password", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    const result = await accountAuthService.requestPasswordReset("missing@example.com");
    expect(result.message).toContain("If an account exists");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("resets password and consumes token atomically", async () => {
    const token = createOpaqueToken();
    mocks.consumeValidToken.mockResolvedValue({ userId: USER_ID });
    mocks.findById.mockResolvedValue(credentialsUser);
    mocks.updatePassword.mockResolvedValue(credentialsUser);

    const result = await accountAuthService.resetPassword(token, "long-enough-password");
    expect(result.success).toBe(true);
    expect(mocks.updatePassword).toHaveBeenCalled();
  });

  it("rejects reset for oauth-only accounts", async () => {
    mocks.runInTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      mocks.consumeValidToken.mockResolvedValue({ userId: USER_ID });
      mocks.findById.mockResolvedValue({
        ...credentialsUser,
        authProvider: "google",
        passwordHash: null,
      });
      return fn({});
    });
    await expect(
      accountAuthService.resetPassword(createOpaqueToken(), "long-enough-password")
    ).rejects.toThrow("invalid or expired");
  });

  it("rejects invalid reset tokens", async () => {
    mocks.consumeValidToken.mockResolvedValue(null);
    await expect(
      accountAuthService.resetPassword(createOpaqueToken(), "long-enough-password")
    ).rejects.toThrow("invalid or expired");
  });

  it("changes password when current password is valid", async () => {
    mocks.findById.mockResolvedValue(credentialsUser);
    mocks.verifyPassword.mockResolvedValue(true);
    const result = await accountAuthService.changePassword(USER_ID, {
      currentPassword: "old-password",
      newPassword: "long-enough-password",
    });
    expect(result.success).toBe(true);
    expect(mocks.updatePassword).toHaveBeenCalledWith(USER_ID, "new-hash");
  });

  it("rejects change password for OAuth-only accounts", async () => {
    mocks.findById.mockResolvedValue({
      ...credentialsUser,
      passwordHash: null,
      authProvider: "google",
    });
    await expect(
      accountAuthService.changePassword(USER_ID, {
        currentPassword: "x",
        newPassword: "long-enough-password",
      })
    ).rejects.toThrow("Google or Apple");
  });

  it("stores only hashed tokens when issuing verification email", async () => {
    mocks.findById.mockResolvedValue(credentialsUser);
    await accountAuthService.sendVerificationEmailForUser(USER_ID);
    const createArgs = mocks.createToken.mock.calls[0][0];
    expect(createArgs.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.tokenHash).not.toContain("=");
  });

  it("validates reset token without consuming it", async () => {
    mocks.findValidToken.mockResolvedValue({ id: "row" });
    await expect(accountAuthService.validatePasswordResetToken("token")).resolves.toEqual({
      valid: true,
    });
    mocks.findValidToken.mockResolvedValue(null);
    await expect(accountAuthService.validatePasswordResetToken("token")).resolves.toEqual({
      valid: false,
    });
  });

  it("rejects verification resend for non-credentials accounts", async () => {
    mocks.findById.mockResolvedValue({
      ...credentialsUser,
      authProvider: "google",
      passwordHash: null,
    });
    await expect(accountAuthService.sendVerificationEmailForUser(USER_ID)).rejects.toThrow(
      "not found"
    );
  });

  it("skips resend when email is already verified", async () => {
    mocks.findById.mockResolvedValue({
      ...credentialsUser,
      emailVerifiedAt: new Date(),
    });
    const result = await accountAuthService.sendVerificationEmailForUser(USER_ID);
    expect(result.alreadyVerified).toBe(true);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("resends verification by email for unverified accounts", async () => {
    mocks.findByEmail.mockResolvedValue(credentialsUser);
    const result = await accountAuthService.resendVerificationByEmail("user@example.com");
    expect(result.message).toContain("verification");
    expect(mocks.sendEmail).toHaveBeenCalled();
  });

  it("rejects change password with wrong current password", async () => {
    mocks.findById.mockResolvedValue(credentialsUser);
    mocks.verifyPassword.mockResolvedValue(false);
    await expect(
      accountAuthService.changePassword(USER_ID, {
        currentPassword: "wrong",
        newPassword: "long-enough-password",
      })
    ).rejects.toThrow("incorrect");
  });

  it("rejects enforce-mode passwords on reset", async () => {
    const original = process.env.PASSWORD_POLICY_ENFORCEMENT;
    process.env.PASSWORD_POLICY_ENFORCEMENT = "enforce";
    process.env.PASSWORD_MIN_LENGTH = "12";
    try {
      await expect(
        accountAuthService.resetPassword(createOpaqueToken(), "password")
      ).rejects.toThrow(/characters|policy|common/i);
    } finally {
      process.env.PASSWORD_POLICY_ENFORCEMENT = original;
    }
  });

  it("does not send resend email when account is missing", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    await accountAuthService.resendVerificationByEmail("missing@example.com");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("skips mark verified when already verified on confirm", async () => {
    const token = createOpaqueToken();
    mocks.consumeValidToken.mockResolvedValue({ userId: USER_ID });
    mocks.findById.mockResolvedValue({
      ...credentialsUser,
      emailVerifiedAt: new Date(),
    });
    await accountAuthService.confirmEmailVerification(token);
    expect(mocks.markEmailVerified).not.toHaveBeenCalled();
  });

  it("rejects change password when enforce policy fails", async () => {
    const original = process.env.PASSWORD_POLICY_ENFORCEMENT;
    process.env.PASSWORD_POLICY_ENFORCEMENT = "enforce";
    process.env.PASSWORD_MIN_LENGTH = "12";
    mocks.findById.mockResolvedValue(credentialsUser);
    mocks.verifyPassword.mockResolvedValue(true);
    try {
      await expect(
        accountAuthService.changePassword(USER_ID, {
          currentPassword: "old-password",
          newPassword: "short",
        })
      ).rejects.toThrow(/characters|policy|common/i);
    } finally {
      process.env.PASSWORD_POLICY_ENFORCEMENT = original;
    }
  });

  it("throws when account auth status user is missing", async () => {
    mocks.findById.mockResolvedValue(null);
    await expect(accountAuthService.getAccountAuthStatus(USER_ID)).rejects.toThrow("not found");
  });

  it("returns account auth status", async () => {
    mocks.findById.mockResolvedValue({
      ...credentialsUser,
      emailVerifiedAt: new Date(),
    });
    await expect(accountAuthService.getAccountAuthStatus(USER_ID)).resolves.toEqual({
      email: "user@example.com",
      authProvider: "credentials",
      hasPassword: true,
      emailVerified: true,
      canChangePassword: true,
    });
  });
});
