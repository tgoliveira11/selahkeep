import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/vault/recovery-phrase/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  replaceRecoveryPhrase: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    replaceRecoveryPhrase: mocks.replaceRecoveryPhrase,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("recovery phrase API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("replaces recovery phrase envelope", async () => {
    mocks.replaceRecoveryPhrase.mockResolvedValue({
      id: "env-1",
      createdAt: "2026-06-17T12:00:00.000Z",
    });

    const res = await POST(
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
          publicMetadata: { phraseLength: 12 },
        }),
      })
    );

    expect(res.status).toBe(201);
    expect(mocks.replaceRecoveryPhrase).toHaveBeenCalled();
  });

  it("rejects plaintext recovery phrase in body", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          recoveryPhrase: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
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

    expect(res.status).toBe(400);
    expect(mocks.replaceRecoveryPhrase).not.toHaveBeenCalled();
  });
});
