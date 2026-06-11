import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as accountGet, DELETE as accountDelete } from "@/app/api/account/route";
import { GET as twoFactorStatusGet } from "@/app/api/account/2fa/status/route";
import { POST as setupVerifyPost } from "@/app/api/account/2fa/setup/verify/route";
import { POST as loginStartPost } from "@/app/api/auth/login/start/route";
import { POST as verify2faPost } from "@/app/api/auth/login/verify-2fa/route";
import { POST as verifyOAuthPost } from "@/app/api/auth/login/verify-2fa-oauth/route";
import { GET as trustedDeviceStatusGet } from "@/app/api/trusted-devices/status/route";
import { GET as vaultStatusGet } from "@/app/api/vault/status/route";
import { POST as recoveryCodePost } from "@/app/api/recovery-code/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";
import { UnauthorizedError } from "@/lib/auth/session";

const sessionUser = { id: USER_ID, email: "user@example.com" };

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: vi.fn(async () => sessionUser),
  requireFullyAuthenticatedUser: vi.fn(async () => sessionUser),
  getSessionUser: vi.fn(async () => sessionUser),
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/account-service", () => ({
  accountService: {
    getDeletionRequirements: vi.fn(async () => ({
      requiresPassword: false,
      authProvider: "google",
      confirmationPhrase: "DELETE",
    })),
    deleteAccount: vi.fn(async () => ({ success: true })),
  },
}));

vi.mock("@/server/services/two-factor-service", () => ({
  twoFactorService: {
    getStatus: vi.fn(async () => ({ enabled: true, enabledAt: null, hasPendingSetup: false })),
    verifySetup: vi.fn(),
    isEnabledForUser: vi.fn(async () => true),
  },
}));

vi.mock("@/server/services/auth-login-service", () => ({
  authLoginService: {
    startCredentialsLogin: vi.fn(),
    verifyTwoFactorLogin: vi.fn(),
    verifyOAuthTwoFactor: vi.fn(),
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

vi.mock("@/server/services/trusted-device-service", () => ({
  trustedDeviceService: {
    getClientDeviceState: vi.fn(async () => ({ state: "active", trustedDeviceId: "device-1" })),
  },
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    getStatus: vi.fn(async () => ({ initialized: true, recoveryState: "Protected" })),
    storeRecoveryCode: vi.fn(async () => ({ id: "recovery-env-1" })),
  },
}));

describe("API route error branches", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { requireSessionUser, requireFullyAuthenticatedUser, getSessionUser } = await import(
      "@/lib/auth/session"
    );
    vi.mocked(requireSessionUser).mockResolvedValue(sessionUser);
    vi.mocked(requireFullyAuthenticatedUser).mockResolvedValue(sessionUser);
    vi.mocked(getSessionUser).mockResolvedValue(sessionUser);
  });

  it("account GET maps unauthorized to 401", async () => {
    const { requireSessionUser } = await import("@/lib/auth/session");
    vi.mocked(requireSessionUser).mockRejectedValue(new UnauthorizedError("Authentication required"));
    const res = await accountGet();
    expect(res.status).toBe(401);
  });

  it("account DELETE rejects invalid payload", async () => {
    const res = await accountDelete(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("account DELETE rejects password in query string", async () => {
    const res = await accountDelete(
      new Request("http://localhost/api/account?password=secret", {
        method: "DELETE",
        body: JSON.stringify({ confirmationPhrase: "DELETE" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("2FA status maps unauthorized to 401", async () => {
    const { requireFullyAuthenticatedUser } = await import("@/lib/auth/session");
    vi.mocked(requireFullyAuthenticatedUser).mockRejectedValue(
      new UnauthorizedError("Authentication required")
    );
    const res = await twoFactorStatusGet();
    expect(res.status).toBe(401);
  });

  it("2FA setup verify rejects invalid payload", async () => {
    const res = await setupVerifyPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ code: "12" }) })
    );
    expect(res.status).toBe(400);
  });

  it("login start rejects invalid credentials and payload", async () => {
    const { authLoginService, InvalidCredentialsError } = await import(
      "@/server/services/auth-login-service"
    );
    const invalid = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "bad", password: "short" }),
      })
    );
    expect(invalid.status).toBe(400);

    vi.mocked(authLoginService.startCredentialsLogin).mockRejectedValue(
      new InvalidCredentialsError()
    );
    const unauthorized = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(unauthorized.status).toBe(401);
  });

  it("verify-2fa maps challenge and code failures", async () => {
    const { authLoginService, InvalidTwoFactorChallengeError, InvalidTwoFactorCodeError } =
      await import("@/server/services/auth-login-service");

    const invalid = await verify2faPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ code: "123456" }) })
    );
    expect(invalid.status).toBe(400);

    vi.mocked(authLoginService.verifyTwoFactorLogin).mockRejectedValue(
      new InvalidTwoFactorChallengeError()
    );
    const challenge = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "challenge-token-1234567890",
          code: "123456",
        }),
      })
    );
    expect(challenge.status).toBe(401);

    vi.mocked(authLoginService.verifyTwoFactorLogin).mockRejectedValue(
      new InvalidTwoFactorCodeError()
    );
    const code = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "challenge-token-1234567890",
          code: "000000",
        }),
      })
    );
    expect(code.status).toBe(401);
  });

  it("verify-2fa-oauth handles unauthenticated, disabled, invalid, and bad codes", async () => {
    const { getSessionUser } = await import("@/lib/auth/session");
    const { twoFactorService } = await import("@/server/services/two-factor-service");
    const { authLoginService, InvalidTwoFactorCodeError } = await import(
      "@/server/services/auth-login-service"
    );

    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    expect((await verifyOAuthPost(new Request("http://localhost", { method: "POST", body: "{}" }))).status).toBe(
      401
    );

    vi.mocked(twoFactorService.isEnabledForUser).mockResolvedValueOnce(false);
    expect(
      (
        await verifyOAuthPost(
          new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ code: "123456" }),
          })
        )
      ).status
    ).toBe(400);

    const invalid = await verifyOAuthPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) })
    );
    expect(invalid.status).toBe(400);

    vi.mocked(authLoginService.verifyOAuthTwoFactor).mockRejectedValue(new InvalidTwoFactorCodeError());
    const badCode = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "000000" }),
      })
    );
    expect(badCode.status).toBe(401);
  });

  it("trusted device status validates deviceId query", async () => {
    const bad = await trustedDeviceStatusGet(
      new Request("http://localhost/api/trusted-devices/status?deviceId=not-a-uuid")
    );
    expect(bad.status).toBe(400);

    const ok = await trustedDeviceStatusGet(
      new Request(
        `http://localhost/api/trusted-devices/status?deviceId=550e8400-e29b-41d4-a716-446655440000`
      )
    );
    expect(ok.status).toBe(200);
  });

  it("vault status and recovery-code routes return success", async () => {
    expect((await vaultStatusGet()).status).toBe(200);
    const recovery = await recoveryCodePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          kdfMetadata: {
            kdf: "argon2id",
            version: "kdf-v1",
            salt: "c2FsdA",
            memory: 65536,
            iterations: 3,
            parallelism: 1,
          },
        }),
      })
    );
    expect(recovery.status).toBe(201);
  });
});
