import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyLoginService } from "@/server/services/passkey-login-service";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  storeChallenge: vi.fn(),
  findByCredentialId: vi.fn(),
  findActivePasskeyEnvelopeByCredentialId: vi.fn(),
  findValidLoginToken: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: mocks.generateAuthenticationOptions,
}));

vi.mock("@/server/repositories/passkey-repository", () => ({
  passkeyRepository: {
    storeChallenge: mocks.storeChallenge,
    findByCredentialId: mocks.findByCredentialId,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    findActivePasskeyEnvelopeByCredentialId: mocks.findActivePasskeyEnvelopeByCredentialId,
  },
}));

vi.mock("@/modules/auth/repositories/login-token-repository", () => ({
  loginTokenRepository: { findValidLoginToken: mocks.findValidLoginToken },
}));

describe("passkey vault-unlock login service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: "vault-challenge" });
    mocks.findValidLoginToken.mockResolvedValue({ userId: USER_ID });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: true,
      transports: null,
    });
    mocks.findActivePasskeyEnvelopeByCredentialId.mockResolvedValue({
      encryptedVaultKey: encryptedPayload,
      publicMetadata: { prfRequired: true },
    });
  });

  it("returns vault unlock options when login token and passkey are valid", async () => {
    const result = await passkeyLoginService.getLoginVaultUnlockOptions(
      "login-token",
      "cred-id"
    );

    expect(result.options.challenge).toBe("vault-challenge");
    expect(result.encryptedVaultKey).toEqual(encryptedPayload);
    expect(result.prfRequired).toBe(true);
    expect(mocks.storeChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ type: "login_vault_unlock", userId: USER_ID })
    );
  });

  it("rejects expired login tokens", async () => {
    mocks.findValidLoginToken.mockResolvedValue(null);
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("bad-token", "cred-id")
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects passkeys without vault unlock", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: false,
    });
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("login-token", "cred-id")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects passkeys that belong to another user", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: "other-user",
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: true,
    });
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("login-token", "cred-id")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects disabled sign-in passkeys", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: false,
      vaultUnlockEnabled: true,
    });
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("login-token", "cred-id")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects unknown credentials", async () => {
    mocks.findByCredentialId.mockResolvedValue(null);
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("login-token", "cred-id")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when no vault envelope exists", async () => {
    mocks.findActivePasskeyEnvelopeByCredentialId.mockResolvedValue(null);
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("login-token", "cred-id")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("defaults prfRequired when envelope metadata is missing", async () => {
    mocks.findActivePasskeyEnvelopeByCredentialId.mockResolvedValue({
      encryptedVaultKey: encryptedPayload,
      publicMetadata: null,
    });
    const result = await passkeyLoginService.getLoginVaultUnlockOptions(
      "login-token",
      "cred-id"
    );
    expect(result.prfRequired).toBe(true);
  });

  it("passes credential transports to WebAuthn options", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: true,
      transports: ["internal"],
    });
    await passkeyLoginService.getLoginVaultUnlockOptions("login-token", "cred-id");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [expect.objectContaining({ transports: ["internal"] })],
      })
    );
  });
});
