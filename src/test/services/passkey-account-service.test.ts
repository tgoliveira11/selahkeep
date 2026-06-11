import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyAccountService } from "@/server/services/passkey-account-service";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  findByIdForUser: vi.fn(),
  storeChallenge: vi.fn(),
  consumeValidChallenge: vi.fn(),
  createCredential: vi.fn(),
  updateCredentialFlags: vi.fn(),
  updateCounter: vi.fn(),
  revoke: vi.fn(),
  createEnvelope: vi.fn(),
  revokeEnvelope: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  record: vi.fn(),
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: mocks.generateRegistrationOptions,
  verifyRegistrationResponse: mocks.verifyRegistrationResponse,
  generateAuthenticationOptions: mocks.generateAuthenticationOptions,
  verifyAuthenticationResponse: mocks.verifyAuthenticationResponse,
}));

vi.mock("@/server/repositories/passkey-repository", () => ({
  passkeyRepository: {
    findByUserId: mocks.findByUserId,
    findByIdForUser: mocks.findByIdForUser,
    storeChallenge: mocks.storeChallenge,
    consumeValidChallenge: mocks.consumeValidChallenge,
    createCredential: mocks.createCredential,
    updateCredentialFlags: mocks.updateCredentialFlags,
    updateCounter: mocks.updateCounter,
    revoke: mocks.revoke,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    createEnvelope: mocks.createEnvelope,
    revokeEnvelope: mocks.revokeEnvelope,
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

function registrationResponse(challenge: string) {
  const clientDataJSON = Buffer.from(
    JSON.stringify({ type: "webauthn.create", challenge, origin: "http://localhost:3001" })
  ).toString("base64url");
  return {
    id: "cred-id",
    rawId: "cred-id",
    type: "public-key",
    response: { clientDataJSON, attestationObject: "oA" },
    clientExtensionResults: {},
  };
}

function authResponse(challenge: string, id = "cred-id") {
  const clientDataJSON = Buffer.from(
    JSON.stringify({ type: "webauthn.get", challenge, origin: "http://localhost:3001" })
  ).toString("base64url");
  return {
    id,
    rawId: id,
    type: "public-key",
    response: { clientDataJSON, authenticatorData: "aa", signature: "sig" },
    clientExtensionResults: {},
  };
}

describe("passkey account service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateRegistrationOptions.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: "auth-challenge" });
    mocks.findByUserId.mockResolvedValue([]);
  });

  it("lists passkeys with capability labels", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        id: "pk-1",
        friendlyName: "Laptop",
        signInEnabled: true,
        vaultUnlockEnabled: false,
        prfSupported: null,
        createdAt: new Date("2026-01-01"),
        lastUsedAt: null,
      },
      {
        id: "pk-2",
        friendlyName: null,
        signInEnabled: true,
        vaultUnlockEnabled: true,
        prfSupported: true,
        createdAt: new Date("2026-01-02"),
        lastUsedAt: new Date("2026-01-03"),
      },
    ]);

    const result = await passkeyAccountService.listPasskeys(USER_ID);
    expect(result).toHaveLength(2);
    expect(result[0].capabilityLabel).toBe("Sign-in only");
    expect(result[1].capabilityLabel).toBe("Sign-in + vault unlock");
  });

  it("rejects invalid registration challenge", async () => {
    mocks.consumeValidChallenge.mockRejectedValue(new Error("expired"));
    await expect(
      passkeyAccountService.verifyRegistration(USER_ID, registrationResponse("bad"))
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects failed registration attestation", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.verifyRegistrationResponse.mockResolvedValue({ verified: false });
    await expect(
      passkeyAccountService.verifyRegistration(USER_ID, registrationResponse("reg-challenge"))
    ).rejects.toThrow("Passkey registration failed");
  });

  it("registers sign-in-only passkey", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-id",
          publicKey: new Uint8Array(32),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "singleDevice",
      },
    });

    const result = await passkeyAccountService.verifyRegistration(
      USER_ID,
      registrationResponse("reg-challenge")
    );

    expect(result.verified).toBe(true);
    expect(result.vaultUnlockEnabled).toBe(false);
    expect(mocks.createCredential).toHaveBeenCalled();
    expect(mocks.createEnvelope).not.toHaveBeenCalled();
  });

  it("registers passkey with vault envelope when PRF confirmed", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-id",
          publicKey: new Uint8Array(32),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "multiDevice",
      },
    });

    const result = await passkeyAccountService.verifyRegistration(
      USER_ID,
      registrationResponse("reg-challenge"),
      {
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
        prfVaultEnvelope: true,
        prfSupported: true,
      }
    );

    expect(result.vaultUnlockEnabled).toBe(true);
    expect(mocks.createEnvelope).toHaveBeenCalled();
  });

  it("enables vault unlock for existing sign-in passkey", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
      vaultUnlockEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
      transports: null,
    });
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "auth-challenge" });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      {
        id: "old-env",
        method: "passkey_authorized_device",
        publicMetadata: { credentialId: "cred-id" },
      },
      {
        id: "other-env",
        method: "passkey_authorized_device",
        publicMetadata: { credentialId: "other-cred" },
      },
    ]);

    const result = await passkeyAccountService.enableVaultUnlock(
      USER_ID,
      "pk-1",
      authResponse("auth-challenge"),
      encryptedPayload("vault_key", USER_ID),
      { prfVaultEnvelope: true, prfSupported: true }
    );

    expect(result.success).toBe(true);
    expect(mocks.updateCredentialFlags).toHaveBeenCalled();
    expect(mocks.createEnvelope).toHaveBeenCalled();
    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("old-env", USER_ID, expect.anything());
    expect(mocks.revokeEnvelope).not.toHaveBeenCalledWith("other-env", USER_ID, expect.anything());
  });

  it("throws when enabling vault unlock for missing passkey", async () => {
    mocks.findByIdForUser.mockResolvedValue(null);
    await expect(
      passkeyAccountService.enableVaultUnlock(
        USER_ID,
        "missing",
        authResponse("auth-challenge"),
        encryptedPayload("vault_key", USER_ID),
        { prfVaultEnvelope: true }
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects enable vault unlock without PRF confirmation", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
      vaultUnlockEnabled: false,
    });

    await expect(
      passkeyAccountService.enableVaultUnlock(
        USER_ID,
        "pk-1",
        authResponse("auth-challenge"),
        encryptedPayload("vault_key", USER_ID)
      )
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("removes passkey and linked envelope", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
    });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      {
        id: "env-1",
        method: "passkey_authorized_device",
        publicMetadata: { credentialId: "cred-id" },
      },
      {
        id: "env-2",
        method: "trusted_device",
        publicMetadata: { credentialId: "cred-id" },
      },
      {
        id: "env-3",
        method: "passkey_authorized_device",
        publicMetadata: { credentialId: "other" },
      },
    ]);

    const result = await passkeyAccountService.removePasskey(USER_ID, "pk-1");
    expect(result.success).toBe(true);
    expect(mocks.revoke).toHaveBeenCalled();
    expect(mocks.revokeEnvelope).toHaveBeenCalledTimes(1);
    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("env-1", USER_ID, expect.anything());
  });

  it("throws when passkey not found", async () => {
    mocks.findByIdForUser.mockResolvedValue(null);
    await expect(passkeyAccountService.removePasskey(USER_ID, "missing")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("returns registration options and stores challenge", async () => {
    const options = await passkeyAccountService.getRegistrationOptions(
      USER_ID,
      "user@example.com"
    );
    expect(options.challenge).toBe("reg-challenge");
    expect(mocks.storeChallenge).toHaveBeenCalled();
  });

  it("returns vault unlock auth options for sign-in-only passkey", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
      vaultUnlockEnabled: false,
      transports: ["internal"],
    });
    const options = await passkeyAccountService.getVaultUnlockAuthOptions(USER_ID, "pk-1");
    expect(options.challenge).toBe("auth-challenge");
  });

  it("rejects vault unlock options when passkey already unlocks vault", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
      vaultUnlockEnabled: true,
    });
    await expect(
      passkeyAccountService.getVaultUnlockAuthOptions(USER_ID, "pk-1")
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects registration without PRF when vault envelope requested", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-id",
          publicKey: new Uint8Array(32),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "singleDevice",
      },
    });

    await expect(
      passkeyAccountService.verifyRegistration(
        USER_ID,
        registrationResponse("reg-challenge"),
        { encryptedVaultKey: encryptedPayload("vault_key", USER_ID) }
      )
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects invalid challenge during vault unlock enable", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
      vaultUnlockEnabled: false,
    });
    mocks.consumeValidChallenge.mockRejectedValue(new Error("expired"));

    await expect(
      passkeyAccountService.enableVaultUnlock(
        USER_ID,
        "pk-1",
        authResponse("auth-challenge"),
        encryptedPayload("vault_key", USER_ID),
        { prfVaultEnvelope: true }
      )
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("wraps WebAuthn verification errors during vault unlock enable", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
      vaultUnlockEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "auth-challenge" });
    mocks.verifyAuthenticationResponse.mockRejectedValue(new Error("bad sig"));

    await expect(
      passkeyAccountService.enableVaultUnlock(
        USER_ID,
        "pk-1",
        authResponse("auth-challenge"),
        encryptedPayload("vault_key", USER_ID),
        { prfVaultEnvelope: true }
      )
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects failed WebAuthn verification during vault unlock enable", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
      vaultUnlockEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "auth-challenge" });
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: false });

    await expect(
      passkeyAccountService.enableVaultUnlock(
        USER_ID,
        "pk-1",
        authResponse("auth-challenge"),
        encryptedPayload("vault_key", USER_ID),
        { prfVaultEnvelope: true }
      )
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects credential mismatch during vault unlock enable", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
      vaultUnlockEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "auth-challenge" });

    await expect(
      passkeyAccountService.enableVaultUnlock(
        USER_ID,
        "pk-1",
        authResponse("auth-challenge", "other-cred"),
        encryptedPayload("vault_key", USER_ID),
        { prfVaultEnvelope: true }
      )
    ).rejects.toBeInstanceOf(ChallengeError);
  });
});
