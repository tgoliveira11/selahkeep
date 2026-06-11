import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as verifyOAuthPost } from "@/app/api/auth/login/verify-2fa-oauth/route";
import { POST as regeneratePost } from "@/app/api/account/2fa/backup-codes/regenerate/route";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  requireFullyAuthenticatedUser: vi.fn(),
  isEnabledForUser: vi.fn(),
  verifyOAuthTwoFactor: vi.fn(),
  regenerateBackupCodes: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
}));

vi.mock("@/server/services/two-factor-service", () => ({
  twoFactorService: {
    isEnabledForUser: mocks.isEnabledForUser,
    regenerateBackupCodes: mocks.regenerateBackupCodes,
  },
}));

vi.mock("@/server/services/auth-login-service", () => ({
  authLoginService: {
    verifyOAuthTwoFactor: mocks.verifyOAuthTwoFactor,
  },
  InvalidTwoFactorCodeError: class InvalidTwoFactorCodeError extends Error {
    name = "InvalidTwoFactorCodeError";
  },
}));

describe("auth login and backup code API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    mocks.isEnabledForUser.mockResolvedValue(true);
  });

  it("verify-2fa-oauth returns upgrade token", async () => {
    mocks.verifyOAuthTwoFactor.mockResolvedValue({ upgradeToken: "upgrade-token" });
    const res = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ upgradeToken: "upgrade-token" });
  });

  it("backup code regeneration returns codes once", async () => {
    mocks.regenerateBackupCodes.mockResolvedValue({ backupCodes: ["AAAA-BBBB-CCCC"] });
    const res = await regeneratePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ backupCodes: ["AAAA-BBBB-CCCC"] });
  });
});
