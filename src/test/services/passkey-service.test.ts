import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyService, RateLimitError } from "@/server/services/passkey-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";
import { resetRateLimit } from "@/server/policies/rate-limit";

const mocks = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  storeChallenge: vi.fn(),
  findValidChallenge: vi.fn(),
  deleteChallenge: vi.fn(),
  createCredential: vi.fn(),
  findByCredentialId: vi.fn(),
  updateCounter: vi.fn(),
  createEnvelope: vi.fn(),
  revokeEnvelope: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  findActiveEnvelopeByMethod: vi.fn(),
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
    findValidChallenge: mocks.findValidChallenge,
    deleteChallenge: mocks.deleteChallenge,
    createCredential: mocks.createCredential,
    findByCredentialId: mocks.findByCredentialId,
    updateCounter: mocks.updateCounter,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    createEnvelope: mocks.createEnvelope,
    revokeEnvelope: mocks.revokeEnvelope,
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
    findActiveEnvelopeByMethod: mocks.findActiveEnvelopeByMethod,
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
    resetRateLimit(`passkey-register:${USER_ID}`);
    resetRateLimit(`passkey-auth:${USER_ID}`);
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
    mocks.findValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "reg-challenge" });
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
      { id: "keep-env", method: "trusted_device" },
    ]);

    const result = await passkeyService.verifyRegistration(
      USER_ID,
      registrationResponse("reg-challenge"),
      encryptedPayload("vault_key", USER_ID)
    );

    expect(result.verified).toBe(true);
    expect(mocks.createCredential).toHaveBeenCalled();
    expect(mocks.createEnvelope).toHaveBeenCalled();
    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("old-env", USER_ID, expect.anything());
    expect(mocks.record).toHaveBeenCalledWith(
      "passkey_added",
      USER_ID,
      undefined,
      expect.anything()
    );
  });

  it("verifyRegistration rejects invalid challenge", async () => {
    mocks.findValidChallenge.mockResolvedValue(null);
    await expect(
      passkeyService.verifyRegistration(USER_ID, registrationResponse("wrong"), undefined)
    ).rejects.toThrow("Invalid or expired challenge");
  });

  it("returns authentication options for a known user", async () => {
    mocks.findByUserId.mockResolvedValue([{ credentialId: "cred-id", transports: ["internal"] }]);
    const options = await passkeyService.getAuthenticationOptions(USER_ID);
    expect(options.challenge).toBe("auth-challenge");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalled();
  });

  it("verifyAuthentication returns vault envelope", async () => {
    mocks.findValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "auth-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      publicKey: Buffer.from(new Uint8Array(32)).toString("base64url"),
      counter: "0",
      transports: ["internal"],
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
    mocks.findActiveEnvelopeByMethod.mockResolvedValue({
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
    mocks.findValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "auth-challenge" });
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
    ).rejects.toThrow("Credential not found");
    expect(mocks.record).toHaveBeenCalledWith("failed_unlock_attempt", USER_ID, {
      method: "passkey",
    });
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
