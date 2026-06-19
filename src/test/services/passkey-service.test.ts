import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyService, RateLimitError } from "@/server/services/passkey-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  storeChallenge: vi.fn(),
  consumeValidChallenge: vi.fn(),
  createCredential: vi.fn(),
  findByCredentialId: vi.fn(),
  updateCounter: vi.fn(),
  updateLastUsedAt: vi.fn(),
  createEnvelope: vi.fn(),
  revokeEnvelope: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  findActiveEnvelopeByMethod: vi.fn(),
  findActivePasskeyEnvelopeByCredentialId: vi.fn(),
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
    storeChallenge: mocks.storeChallenge,
    consumeValidChallenge: mocks.consumeValidChallenge,
    createCredential: mocks.createCredential,
    findByCredentialId: mocks.findByCredentialId,
    updateCounter: mocks.updateCounter,
    updateLastUsedAt: mocks.updateLastUsedAt,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    createEnvelope: mocks.createEnvelope,
    revokeEnvelope: mocks.revokeEnvelope,
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
    findActiveEnvelopeByMethod: mocks.findActiveEnvelopeByMethod,
    findActivePasskeyEnvelopeByCredentialId: mocks.findActivePasskeyEnvelopeByCredentialId,
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
    revokeEnvelope: mocks.revokeEnvelope,
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
    response: {
      clientDataJSON,
      attestationObject: "oA",
    },
    clientExtensionResults: {},
  };
}

describe("passkey service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByUserId.mockResolvedValue([]);
    mocks.generateRegistrationOptions.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: "auth-challenge" });
  });

  it("returns registration options and stores challenge", async () => {
    mocks.findByUserId.mockResolvedValue([{ credentialId: "existing-cred", transports: ["internal"] }]);
    const options = await passkeyService.getRegistrationOptions(USER_ID, "user@example.com");
    expect(options.challenge).toBe("reg-challenge");
    expect(mocks.storeChallenge).toHaveBeenCalled();
  });

  it("verifies registration and stores passkey envelope", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "reg-challenge" });
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
        credentialBackedUp: false,
      },
    });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      { id: "old-env", method: "passkey_authorized_device" },
      { id: "keep-env", method: "recovery_code" },
    ]);

    const result = await passkeyService.verifyRegistration(
      USER_ID,
      registrationResponse("reg-challenge"),
      encryptedPayload("vault_key", USER_ID),
      { prfVaultEnvelope: true }
    );

    expect(result.verified).toBe(true);
    expect(mocks.createCredential).toHaveBeenCalled();
    expect(mocks.createEnvelope).toHaveBeenCalled();
    expect(mocks.revokeEnvelope).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(
      "passkey_added",
      USER_ID,
      undefined,
      expect.anything()
    );
  });

  it("registers vault-only passkey with signInEnabled false when vaultOnly is set", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "reg-challenge" });
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
        credentialBackedUp: false,
      },
    });

    await passkeyService.verifyRegistration(
      USER_ID,
      registrationResponse("reg-challenge"),
      encryptedPayload("vault_key", USER_ID),
      { prfVaultEnvelope: true, vaultOnly: true }
    );

    expect(mocks.createCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        signInEnabled: false,
        vaultUnlockEnabled: true,
        friendlyName: "Vault passkey",
      }),
      expect.anything()
    );
  });

  it("verifyRegistration rejects invalid challenge", async () => {
    mocks.consumeValidChallenge.mockRejectedValue(new Error("Invalid or expired challenge"));
    await expect(
      passkeyService.verifyRegistration(USER_ID, registrationResponse("wrong"), undefined)
    ).rejects.toThrow("Invalid or expired challenge");
  });

  it("rejects passkey vault envelope without PRF confirmation", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "reg-challenge" });
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
        credentialBackedUp: false,
      },
    });

    await expect(
      passkeyService.verifyRegistration(
        USER_ID,
        registrationResponse("reg-challenge"),
        encryptedPayload("vault_key", USER_ID)
      )
    ).rejects.toThrow("Passkey vault unlock requires PRF support");
    expect(mocks.createEnvelope).not.toHaveBeenCalled();
    expect(mocks.revokeEnvelope).not.toHaveBeenCalled();
  });

  it("registers passkey credential without vault envelope when none is provided", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "reg-challenge" });
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
        credentialBackedUp: false,
      },
    });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      { id: "keep-env", method: "passkey_authorized_device" },
    ]);

    await passkeyService.verifyRegistration(USER_ID, registrationResponse("reg-challenge"));

    expect(mocks.createCredential).toHaveBeenCalled();
    expect(mocks.createEnvelope).not.toHaveBeenCalled();
    expect(mocks.revokeEnvelope).not.toHaveBeenCalled();
  });

  it("returns authentication options for a known user", async () => {
    mocks.findByUserId.mockResolvedValue([{ credentialId: "cred-id", transports: ["internal"] }]);
    const options = await passkeyService.getAuthenticationOptions(USER_ID);
    expect(options.challenge).toBe("auth-challenge");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalled();
  });

  it("verifyAuthentication returns vault envelope", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "auth-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      publicKey: Buffer.from(new Uint8Array(32)).toString("base64url"),
      counter: "0",
      transports: ["internal"],
      vaultUnlockEnabled: true,
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
    mocks.findActivePasskeyEnvelopeByCredentialId.mockResolvedValue({
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
    });

    const clientDataJSON = Buffer.from(
      JSON.stringify({ type: "webauthn.get", challenge: "auth-challenge", origin: "http://localhost:3001" })
    ).toString("base64url");

    const result = await passkeyService.verifyAuthentication(USER_ID, {
      id: "cred-id",
      rawId: "cred-id",
      type: "public-key",
      response: { clientDataJSON, authenticatorData: "aa", signature: "sig" },
      clientExtensionResults: {},
    });

    expect(result.verified).toBe(true);
    expect(result.encryptedVaultKey).toBeTruthy();
  });

  it("verifyAuthentication rejects unknown credential", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "auth-challenge" });
    mocks.findByCredentialId.mockResolvedValue(null);
    const clientDataJSON = Buffer.from(
      JSON.stringify({ type: "webauthn.get", challenge: "auth-challenge", origin: "http://localhost:3001" })
    ).toString("base64url");
    await expect(
      passkeyService.verifyAuthentication(USER_ID, {
        id: "missing",
        rawId: "missing",
        type: "public-key",
        response: { clientDataJSON, authenticatorData: "aa", signature: "sig" },
        clientExtensionResults: {},
      })
    ).rejects.toThrow("This passkey is not registered");
    expect(mocks.record).toHaveBeenCalledWith("failed_unlock_attempt", USER_ID, {
      method: "passkey",
    });
  });

  it("returns authentication options without user credentials", async () => {
    const options = await passkeyService.getAuthenticationOptions();
    expect(options.challenge).toBe("auth-challenge");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ allowCredentials: undefined })
    );
  });

  it("verifyAuthentication rejects invalid challenge and failed verification", async () => {
    mocks.consumeValidChallenge.mockRejectedValue(new Error("expired"));
    const clientDataJSON = Buffer.from(
      JSON.stringify({ type: "webauthn.get", challenge: "bad", origin: "http://localhost:3001" })
    ).toString("base64url");
    const response = {
      id: "cred-id",
      rawId: "cred-id",
      type: "public-key" as const,
      response: { clientDataJSON, authenticatorData: "aa", signature: "sig" },
      clientExtensionResults: {},
    };
    await expect(passkeyService.verifyAuthentication(USER_ID, response)).rejects.toThrow(
      "Invalid or expired challenge"
    );

    mocks.consumeValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "auth-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      publicKey: Buffer.from(new Uint8Array(32)).toString("base64url"),
      counter: "0",
      transports: ["internal"],
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: false,
      authenticationInfo: { newCounter: 1 },
    });
    await expect(passkeyService.verifyAuthentication(USER_ID, response)).rejects.toThrow(
      "Passkey authentication failed"
    );
  });

  it("rate limits registration", async () => {
    for (let i = 0; i < 10; i++) {
      await passkeyService.getRegistrationOptions(USER_ID, "user@example.com");
    }
    await expect(
      passkeyService.getRegistrationOptions(USER_ID, "user@example.com")
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
