import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyLoginService } from "@/server/services/passkey-login-service";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  storeChallenge: vi.fn(),
  consumeValidChallenge: vi.fn(),
  findByCredentialId: vi.fn(),
  updateCounter: vi.fn(),
  updateLastUsedAt: vi.fn(),
  findActivePasskeyEnvelopeByCredentialId: vi.fn(),
  issueLoginToken: vi.fn(),
  recordLoginSuccess: vi.fn(),
  record: vi.fn(),
  findByEmail: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findValidLoginToken: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: mocks.generateAuthenticationOptions,
  verifyAuthenticationResponse: mocks.verifyAuthenticationResponse,
}));

vi.mock("@/server/repositories/passkey-repository", () => ({
  passkeyRepository: {
    storeChallenge: mocks.storeChallenge,
    consumeValidChallenge: mocks.consumeValidChallenge,
    findByCredentialId: mocks.findByCredentialId,
    updateCounter: mocks.updateCounter,
    updateLastUsedAt: mocks.updateLastUsedAt,
    findByUserId: mocks.findByUserId,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    findActivePasskeyEnvelopeByCredentialId: mocks.findActivePasskeyEnvelopeByCredentialId,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: { findByEmail: mocks.findByEmail, findById: mocks.findById },
}));

vi.mock("@/server/services/auth-login-service", () => ({
  authLoginService: { issueLoginToken: mocks.issueLoginToken },
}));

vi.mock("@/server/services/auth-service", () => ({
  authService: { recordLoginSuccess: mocks.recordLoginSuccess },
}));

vi.mock("@/server/repositories/two-factor-repository", () => ({
  twoFactorRepository: { findValidLoginToken: mocks.findValidLoginToken },
}));

function authResponse(challenge: string, id = "cred-id") {
  const clientDataJSON = Buffer.from(
    JSON.stringify({ type: "webauthn.get", challenge, origin: "http://localhost:3001" })
  ).toString("base64url");
  return {
    id,
    rawId: id,
    type: "public-key",
    response: {
      clientDataJSON,
      authenticatorData: "aa",
      signature: "sig",
    },
    clientExtensionResults: {},
  };
}

describe("passkey login service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByUserId.mockResolvedValue([]);
  });

  it("stores login challenge for discoverable authentication", async () => {
    const result = await passkeyLoginService.getLoginOptions();
    expect(result.options.challenge).toBe("login-challenge");
    expect(mocks.storeChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ type: "login", userId: undefined })
    );
  });

  it("falls back to all sign-in credentials when preferred credential is stale", async () => {
    mocks.findById.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      { credentialId: "cred-a", signInEnabled: true, transports: ["internal"] },
      { credentialId: "cred-b", signInEnabled: true, transports: null },
    ]);

    await passkeyLoginService.getLoginOptions({
      userId: USER_ID,
      credentialId: "missing-cred",
    });

    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [
          { id: "cred-a", transports: ["internal"] },
          { id: "cred-b", transports: undefined },
        ],
      })
    );
  });

  it("prefers credentialId lookup over userId when both are provided", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      transports: null,
    });

    const result = await passkeyLoginService.getLoginOptions({
      userId: USER_ID,
      credentialId: "cred-id",
    });

    expect(result.prfIncluded).toBe(true);
    expect(mocks.findByCredentialId).toHaveBeenCalledWith("cred-id");
    expect(mocks.findById).not.toHaveBeenCalled();
  });

  it("falls back to userId when cached credentialId is stale", async () => {
    mocks.findByCredentialId.mockResolvedValue(null);
    mocks.findById.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "new-cred",
        signInEnabled: true,
        vaultUnlockEnabled: true,
        transports: null,
      },
    ]);

    const result = await passkeyLoginService.getLoginOptions({
      userId: USER_ID,
      credentialId: "stale-cred",
    });

    expect(result.prfIncluded).toBe(true);
    expect(mocks.findById).toHaveBeenCalledWith(USER_ID);
  });

  it("includes PRF when cached credentialId is provided", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      transports: null,
    });

    const result = await passkeyLoginService.getLoginOptions({
      credentialId: "cred-id",
    });

    expect(result.prfIncluded).toBe(true);
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: "cred-id", transports: undefined }],
        extensions: expect.any(Object),
      })
    );
  });

  it("omits PRF when cached credentialId is unknown", async () => {
    mocks.findByCredentialId.mockResolvedValue(null);
    const result = await passkeyLoginService.getLoginOptions({ credentialId: "missing" });
    expect(result.prfIncluded).toBe(false);
  });

  it("includes PRF when cached userId is provided", async () => {
    mocks.findById.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "cred-id",
        signInEnabled: true,
        vaultUnlockEnabled: true,
        transports: null,
      },
    ]);

    const result = await passkeyLoginService.getLoginOptions({
      userId: USER_ID,
      credentialId: "cred-id",
    });

    expect(result.prfIncluded).toBe(true);
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: "cred-id", transports: undefined }],
        extensions: expect.any(Object),
      })
    );
  });

  it("omits PRF when email does not match a user", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    const result = await passkeyLoginService.getLoginOptions({ email: "missing@example.com" });
    expect(result.prfIncluded).toBe(false);
  });

  it("omits PRF when user has no sign-in passkeys", async () => {
    mocks.findByEmail.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      { credentialId: "cred-id", signInEnabled: false, transports: null },
    ]);
    const result = await passkeyLoginService.getLoginOptions({ email: "user@example.com" });
    expect(result.prfIncluded).toBe(true);
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ allowCredentials: undefined })
    );
  });

  it("includes PRF extensions when email resolves to a user", async () => {
    mocks.findByEmail.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      { credentialId: "cred-id", signInEnabled: true, transports: null },
    ]);

    const result = await passkeyLoginService.getLoginOptions({ email: "user@example.com" });
    expect(result.prfIncluded).toBe(true);
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ extensions: expect.any(Object) })
    );
  });

  it("rejects reused or invalid login challenges", async () => {
    mocks.consumeValidChallenge.mockRejectedValue(new Error("expired"));
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
      vaultUnlockEnabled: false,
    });

    await expect(
      passkeyLoginService.verifyLogin(authResponse("bad-challenge"))
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects unknown or sign-in-disabled credentials", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue(null);

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects credentials with sign-in disabled", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("wraps WebAuthn verification errors", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });
    mocks.verifyAuthenticationResponse.mockRejectedValue(new Error("bad sig"));

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects failed WebAuthn verification", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: false });

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("issues login token without requiring TOTP and returns vault envelope metadata", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      id: "db-id",
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
      transports: null,
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
    mocks.findActivePasskeyEnvelopeByCredentialId.mockResolvedValue({
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      publicMetadata: { prfRequired: true },
    });
    mocks.issueLoginToken.mockResolvedValue("login-token");

    const result = await passkeyLoginService.verifyLogin(authResponse("login-challenge"));

    expect(result.loginToken).toBe("login-token");
    expect(result.credentialId).toBe("cred-id");
    expect(result.vaultUnlockAvailable).toBe(true);
    expect(result.encryptedVaultKey).toBeTruthy();
    expect(mocks.recordLoginSuccess).toHaveBeenCalledWith(USER_ID, "passkey");
  });

  it("returns PRF vault unlock options for a valid login token", async () => {
    mocks.findValidLoginToken.mockResolvedValue({ userId: USER_ID });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: true,
      transports: null,
    });
    mocks.findActivePasskeyEnvelopeByCredentialId.mockResolvedValue({
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      publicMetadata: { prfRequired: true },
    });

    const result = await passkeyLoginService.getLoginVaultUnlockOptions(
      "login-token",
      "cred-id"
    );

    expect(result.options.challenge).toBe("login-challenge");
    expect(result.encryptedVaultKey).toBeTruthy();
    expect(mocks.storeChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ type: "login_vault_unlock", userId: USER_ID })
    );
  });

  it("returns no vault envelope for sign-in-only credentials", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
    mocks.issueLoginToken.mockResolvedValue("login-token");

    const result = await passkeyLoginService.verifyLogin(authResponse("login-challenge"));
    expect(result.vaultUnlockAvailable).toBe(false);
    expect(result.encryptedVaultKey).toBeNull();
  });

  it("rejects vault unlock options for expired login token", async () => {
    mocks.findValidLoginToken.mockResolvedValue(null);
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("bad-token", "cred-id")
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects vault unlock options when credential cannot unlock vault", async () => {
    mocks.findValidLoginToken.mockResolvedValue({ userId: USER_ID });
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

  it("rejects vault unlock options for unknown credential", async () => {
    mocks.findValidLoginToken.mockResolvedValue({ userId: USER_ID });
    mocks.findByCredentialId.mockResolvedValue(null);
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("login-token", "cred-id")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects vault unlock options when sign-in is disabled on credential", async () => {
    mocks.findValidLoginToken.mockResolvedValue({ userId: USER_ID });
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

  it("rejects vault unlock options for credential owned by another user", async () => {
    mocks.findValidLoginToken.mockResolvedValue({ userId: USER_ID });
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

  it("rejects vault unlock options when envelope is missing", async () => {
    mocks.findValidLoginToken.mockResolvedValue({ userId: USER_ID });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      vaultUnlockEnabled: true,
      transports: null,
    });
    mocks.findActivePasskeyEnvelopeByCredentialId.mockResolvedValue(null);
    await expect(
      passkeyLoginService.getLoginVaultUnlockOptions("login-token", "cred-id")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
