import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as statusGet } from "@/app/api/account/2fa/status/route";
import { POST as setupStartPost } from "@/app/api/account/2fa/setup/start/route";
import { POST as setupVerifyPost } from "@/app/api/account/2fa/setup/verify/route";
import { POST as disablePost } from "@/app/api/account/2fa/disable/route";
import { POST as loginStartPost } from "@/app/api/auth/login/start/route";
import { POST as verify2faPost } from "@/app/api/auth/login/verify-2fa/route";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  getStatus: vi.fn(),
  startSetup: vi.fn(),
  verifySetup: vi.fn(),
  disable: vi.fn(),
  startCredentialsLogin: vi.fn(),
  verifyTwoFactorLogin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
}));

vi.mock("@/server/services/two-factor-service", () => ({
  twoFactorService: {
    getStatus: mocks.getStatus,
    startSetup: mocks.startSetup,
    verifySetup: mocks.verifySetup,
    disable: mocks.disable,
  },
}));

vi.mock("@/server/services/auth-login-service", () => ({
  authLoginService: {
    startCredentialsLogin: mocks.startCredentialsLogin,
    verifyTwoFactorLogin: mocks.verifyTwoFactorLogin,
  },
  InvalidCredentialsError: class InvalidCredentialsError extends Error {
    name = "InvalidCredentialsError";
  },
  InvalidTwoFactorChallengeError: class InvalidTwoFactorChallengeError extends Error {
    name = "InvalidTwoFactorChallengeError";
  },
  InvalidTwoFactorCodeError: class InvalidTwoFactorCodeError extends Error {
    name = "InvalidTwoFactorCodeError";
  },
}));

describe("two-factor API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
  });

  it("GET status returns 2FA state", async () => {
    mocks.getStatus.mockResolvedValue({ enabled: false, enabledAt: null, hasPendingSetup: false });
    const res = await statusGet();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      enabled: false,
      enabledAt: null,
      hasPendingSetup: false,
    });
  });

  it("setup start does not return otpauth URL with secret after start", async () => {
    mocks.startSetup.mockResolvedValue({
      qrCodeDataUrl: "data:image/png;base64,abc",
      manualSetupKey: "SECRETKEY",
      otpauthUrl: "otpauth://totp/secret",
      issuer: "Letters to God",
      accountLabel: "user@example.com",
    });
    const res = await setupStartPost(new Request("http://localhost"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("otpauthUrl");
    expect(body.manualSetupKey).toBe("SECRETKEY");
  });

  it("setup verify returns backup codes once", async () => {
    mocks.verifySetup.mockResolvedValue({ success: true, backupCodes: ["AAAA-BBBB-CCCC"] });
    const res = await setupVerifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    await expect(res.json()).resolves.toEqual({
      success: true,
      backupCodes: ["AAAA-BBBB-CCCC"],
    });
  });

  it("login start returns challenge when 2FA is enabled", async () => {
    mocks.startCredentialsLogin.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "challenge-token",
    });
    const res = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    await expect(res.json()).resolves.toEqual({
      requiresTwoFactor: true,
      challengeToken: "challenge-token",
    });
  });

  it("disable requires authenticated user and valid payload", async () => {
    mocks.disable.mockResolvedValue({ success: true });
    const res = await disablePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it("verify-2fa returns login token on success", async () => {
    mocks.verifyTwoFactorLogin.mockResolvedValue({ loginToken: "login-token" });
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "challenge-token-1234567890",
          code: "123456",
        }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ loginToken: "login-token" });
  });
});
