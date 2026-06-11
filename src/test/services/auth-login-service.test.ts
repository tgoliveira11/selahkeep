import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  authLoginService,
  InvalidCredentialsError,
  InvalidTwoFactorCodeError,
} from "@/server/services/auth-login-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  assertLoginAllowed: vi.fn(),
  recordLoginFailure: vi.fn(),
  recordLoginSuccess: vi.fn(),
  findByEmail: vi.fn(),
  findById: vi.fn(),
  createLoginChallenge: vi.fn(),
  consumeLoginChallenge: vi.fn(),
  createLoginToken: vi.fn(),
  consumeLoginToken: vi.fn(),
  isEnabledForUser: vi.fn(),
  verifyLoginCode: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/server/services/auth-service", () => ({
  authService: {
    assertLoginAllowed: mocks.assertLoginAllowed,
    recordLoginFailure: mocks.recordLoginFailure,
    recordLoginSuccess: mocks.recordLoginSuccess,
  },
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: {
    findByEmail: mocks.findByEmail,
    findById: mocks.findById,
  },
}));

vi.mock("@/server/repositories/two-factor-repository", () => ({
  twoFactorRepository: {
    createLoginChallenge: mocks.createLoginChallenge,
    consumeLoginChallenge: mocks.consumeLoginChallenge,
    createLoginToken: mocks.createLoginToken,
    consumeLoginToken: mocks.consumeLoginToken,
  },
}));

vi.mock("@/server/services/two-factor-service", () => ({
  twoFactorService: {
    isEnabledForUser: mocks.isEnabledForUser,
    verifyLoginCode: mocks.verifyLoginCode,
    createSessionUpgradeToken: vi.fn(async () => "upgrade-token"),
  },
}));

vi.mock("@/server/policies/password-hashing", () => ({
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: vi.fn() },
}));

describe("auth login service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByEmail.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      passwordHash: "$2b$12$hash",
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.isEnabledForUser.mockResolvedValue(false);
    mocks.createLoginToken.mockResolvedValue({ id: "token-row" });
    mocks.findById.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("issues login token when 2FA is disabled", async () => {
    const result = await authLoginService.startCredentialsLogin(
      "user@example.com",
      "password123"
    );
    expect(result.requiresTwoFactor).toBe(false);
    expect(result).toHaveProperty("loginToken");
    expect(mocks.recordLoginSuccess).toHaveBeenCalledWith(USER_ID, "credentials");
  });

  it("returns challenge when 2FA is enabled", async () => {
    mocks.isEnabledForUser.mockResolvedValue(true);
    const result = await authLoginService.startCredentialsLogin(
      "user@example.com",
      "password123"
    );
    expect(result).toEqual({
      requiresTwoFactor: true,
      challengeToken: expect.any(String),
    });
    expect(mocks.createLoginChallenge).toHaveBeenCalled();
  });

  it("rejects invalid credentials", async () => {
    mocks.verifyPassword.mockResolvedValue(false);
    await expect(
      authLoginService.startCredentialsLogin("user@example.com", "wrong")
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects accounts without a password hash", async () => {
    mocks.findByEmail.mockResolvedValue({ id: USER_ID, email: "user@example.com", passwordHash: null });
    await expect(
      authLoginService.startCredentialsLogin("user@example.com", "password123")
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("verifies 2FA and issues login token", async () => {
    mocks.consumeLoginChallenge.mockResolvedValue({
      userId: USER_ID,
      authProvider: "credentials",
    });
    mocks.verifyLoginCode.mockResolvedValue(true);

    const result = await authLoginService.verifyTwoFactorLogin("challenge", { code: "123456" });
    expect(result.loginToken).toBeTruthy();
    expect(mocks.recordLoginSuccess).toHaveBeenCalled();
  });

  it("rejects invalid 2FA codes", async () => {
    mocks.consumeLoginChallenge.mockResolvedValue({
      userId: USER_ID,
      authProvider: "credentials",
    });
    mocks.verifyLoginCode.mockResolvedValue(false);
    await expect(
      authLoginService.verifyTwoFactorLogin("challenge", { code: "000000" })
    ).rejects.toBeInstanceOf(InvalidTwoFactorCodeError);
  });

  it("consumes login token for NextAuth", async () => {
    mocks.consumeLoginToken.mockResolvedValue({ userId: USER_ID });
    const user = await authLoginService.consumeLoginToken("login-token");
    expect(user?.id).toBe(USER_ID);
  });

  it("returns null when login token is invalid", async () => {
    mocks.consumeLoginToken.mockResolvedValue(null);
    await expect(authLoginService.consumeLoginToken("bad")).resolves.toBeNull();
  });

  it("rejects expired login challenges", async () => {
    mocks.consumeLoginChallenge.mockResolvedValue(null);
    await expect(
      authLoginService.verifyTwoFactorLogin("bad", { code: "123456" })
    ).rejects.toMatchObject({ name: "InvalidTwoFactorChallengeError" });
  });

  it("verifies OAuth 2FA and returns upgrade token", async () => {
    mocks.verifyLoginCode.mockResolvedValue(true);
    const result = await authLoginService.verifyOAuthTwoFactor(USER_ID, { code: "123456" });
    expect(result.upgradeToken).toBe("upgrade-token");
  });

  it("rejects invalid OAuth 2FA codes", async () => {
    mocks.verifyLoginCode.mockResolvedValue(false);
    await expect(
      authLoginService.verifyOAuthTwoFactor(USER_ID, { code: "000000" })
    ).rejects.toBeInstanceOf(InvalidTwoFactorCodeError);
  });
});
