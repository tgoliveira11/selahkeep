import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyVaultEnvelopeService } from "@/server/services/passkey-vault-envelope-service";

const mocks = vi.hoisted(() => ({
  findByIdForUser: vi.fn(),
  consumeValidChallenge: vi.fn(),
  updateCounter: vi.fn(),
  updateCredentialFlags: vi.fn(),
  revoke: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  revokeEnvelope: vi.fn(),
  record: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: vi.fn().mockResolvedValue({ challenge: "auth-challenge" }),
  verifyAuthenticationResponse: mocks.verifyAuthenticationResponse,
}));

vi.mock("@/server/repositories/passkey-repository", () => ({
  passkeyRepository: {
    findByIdForUser: mocks.findByIdForUser,
    consumeValidChallenge: mocks.consumeValidChallenge,
    updateCounter: mocks.updateCounter,
    updateCredentialFlags: mocks.updateCredentialFlags,
    revoke: mocks.revoke,
    storeChallenge: vi.fn(),
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
    revokeEnvelope: mocks.revokeEnvelope,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

function authResponse(challenge: string, credentialId: string) {
  const clientDataJSON = Buffer.from(
    JSON.stringify({ type: "webauthn.get", challenge, origin: "http://localhost:3001" })
  ).toString("base64url");
  return {
    id: credentialId,
    rawId: credentialId,
    type: "public-key" as const,
    response: { clientDataJSON, authenticatorData: "aa", signature: "sig" },
    clientExtensionResults: { prf: { results: { first: new ArrayBuffer(32) } } },
  };
}

describe("passkey vault lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeValidChallenge.mockResolvedValue({ id: "ch-1", challenge: "auth-challenge" });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      {
        id: "env-1",
        method: "passkey_authorized_device",
        publicMetadata: { credentialId: "vault-cred" },
      },
    ]);
  });

  it("disabling vault-only passkey revokes credential row and envelope", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "db-vault",
      userId: "user-1",
      credentialId: "vault-cred",
      publicKey: Buffer.from(new Uint8Array(32)).toString("base64url"),
      counter: "0",
      signInEnabled: false,
      vaultUnlockEnabled: true,
    });

    await passkeyVaultEnvelopeService.disableVaultUnlockWithProof(
      "user-1",
      "db-vault",
      authResponse("auth-challenge", "vault-cred")
    );

    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("env-1", "user-1", expect.anything());
    expect(mocks.revoke).toHaveBeenCalledWith("db-vault", "user-1", expect.anything());
    expect(mocks.updateCredentialFlags).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(
      "passkey_vault_unlock_disabled",
      "user-1",
      { credentialId: "vault-cred" },
      expect.anything()
    );
    expect(mocks.record).toHaveBeenCalledWith("passkey_removed", "user-1", undefined, expect.anything());
  });

  it("disabling dual-purpose passkey keeps sign-in credential and clears vault flag only", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "db-dual",
      userId: "user-1",
      credentialId: "dual-cred",
      publicKey: Buffer.from(new Uint8Array(32)).toString("base64url"),
      counter: "0",
      signInEnabled: true,
      vaultUnlockEnabled: true,
    });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      {
        id: "env-dual",
        method: "passkey_authorized_device",
        publicMetadata: { credentialId: "dual-cred" },
      },
    ]);

    await passkeyVaultEnvelopeService.disableVaultUnlockWithProof(
      "user-1",
      "db-dual",
      authResponse("auth-challenge", "dual-cred")
    );

    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("env-dual", "user-1", expect.anything());
    expect(mocks.updateCredentialFlags).toHaveBeenCalledWith(
      "db-dual",
      "user-1",
      { vaultUnlockEnabled: false },
      expect.anything()
    );
    expect(mocks.revoke).not.toHaveBeenCalled();
  });
});
