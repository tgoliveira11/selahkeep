import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  optionsIncludePrf,
  passkeyLoginService,
} from "@/server/services/passkey-login-service";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  storeChallenge: vi.fn(),
  findByCredentialId: vi.fn(),
  findByUserId: vi.fn(),
  findByEmail: vi.fn(),
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
    findByUserId: mocks.findByUserId,
  },
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: {
    findByEmail: mocks.findByEmail,
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
    mocks.findByUserId.mockResolvedValue([
      {
        userId: USER_ID,
        credentialId: "cred-id",
        signInEnabled: true,
        vaultUnlockEnabled: true,
      },
    ]);
  });

  it("adds PRF to login options when the hinted passkey can unlock the vault", async () => {
    const enriched = await passkeyLoginService.enrichLoginOptionsWithVaultPrf(
      { credentialId: "cred-id", userId: USER_ID },
      { challenge: "login-challenge", rpId: "localhost" }
    );

    expect(enriched.extensions).toEqual({
      prf: { eval: { first: expect.any(String) } },
    });
  });

  it("leaves login options unchanged when no vault envelope exists", async () => {
    mocks.findActivePasskeyEnvelopeByCredentialId.mockResolvedValue(null);
    const options = { challenge: "login-challenge", rpId: "localhost" };
    const enriched = await passkeyLoginService.enrichLoginOptionsWithVaultPrf(
      { credentialId: "cred-id", userId: USER_ID },
      options
    );
    expect(enriched).toEqual(options);
  });

  it("adds evalByCredential PRF when multiple vault passkeys are allowed", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        userId: USER_ID,
        credentialId: "cred-a",
        signInEnabled: true,
        vaultUnlockEnabled: true,
      },
      {
        userId: USER_ID,
        credentialId: "cred-b",
        signInEnabled: true,
        vaultUnlockEnabled: true,
      },
    ]);
    mocks.findByCredentialId.mockImplementation(async (credentialId: string) => ({
      userId: USER_ID,
      credentialId,
      signInEnabled: true,
      vaultUnlockEnabled: true,
      transports: null,
    }));

    const enriched = await passkeyLoginService.enrichLoginOptionsWithVaultPrf(
      { userId: USER_ID },
      { challenge: "login-challenge", rpId: "localhost" }
    );

    expect(enriched.extensions).toEqual({
      prf: {
        evalByCredential: {
          "cred-a": { first: expect.any(String) },
          "cred-b": { first: expect.any(String) },
        },
      },
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

  it("detects PRF extensions in WebAuthn options", () => {
    expect(
      optionsIncludePrf({ extensions: { prf: { eval: { first: "salt" } } } })
    ).toBe(true);
    expect(optionsIncludePrf({ extensions: {} })).toBe(false);
    expect(optionsIncludePrf(null)).toBe(false);
  });

  it("returns vault metadata when credential has a PRF envelope", async () => {
    const result = await passkeyLoginService.getVaultUnlockMetadataForCredential(
      USER_ID,
      "cred-id"
    );
    expect(result.vaultUnlockAvailable).toBe(true);
    expect(result.encryptedVaultKey).toEqual(encryptedPayload);
    expect(result.prfRequired).toBe(true);
  });

  it("returns unavailable metadata when credential lacks vault unlock", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: false,
    });
    const result = await passkeyLoginService.getVaultUnlockMetadataForCredential(
      USER_ID,
      "cred-id"
    );
    expect(result).toEqual({
      vaultUnlockAvailable: false,
      encryptedVaultKey: null,
      prfRequired: true,
    });
  });

  it("returns unavailable metadata when sign-in is disabled on credential", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: false,
      vaultUnlockEnabled: true,
    });
    const result = await passkeyLoginService.getVaultUnlockMetadataForCredential(
      USER_ID,
      "cred-id"
    );
    expect(result.vaultUnlockAvailable).toBe(false);
  });

  it("returns unavailable metadata when credential belongs to another user", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: "other-user",
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: true,
    });
    const result = await passkeyLoginService.getVaultUnlockMetadataForCredential(
      USER_ID,
      "cred-id"
    );
    expect(result.vaultUnlockAvailable).toBe(false);
  });

  it("returns unavailable metadata when credential is unknown", async () => {
    mocks.findByCredentialId.mockResolvedValue(null);
    const result = await passkeyLoginService.getVaultUnlockMetadataForCredential(
      USER_ID,
      "cred-id"
    );
    expect(result.vaultUnlockAvailable).toBe(false);
  });
});
