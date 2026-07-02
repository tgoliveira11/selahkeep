import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: vi.fn(async () => ({ id: USER_ID })),
}));

const getUnlockEnvelopeMock = vi.fn();
vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    getUnlockEnvelope: getUnlockEnvelopeMock,
  },
}));

describe("POST /api/vault/unlock-envelope", () => {
  beforeEach(() => {
    getUnlockEnvelopeMock.mockReset();
    getUnlockEnvelopeMock.mockResolvedValue({
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      kdfMetadata: {
        kdf: "argon2id",
        version: "kdf-v1",
        salt: "c2FsdA",
        memory: 65536,
        iterations: 3,
        parallelism: 1,
      },
    });
  });

  it("rejects plaintext recovery phrase", async () => {
    const { POST } = await import("@/app/api/vault/unlock-envelope/route");
    const response = await POST(
      new Request("http://localhost/api/vault/unlock-envelope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryPhrase: "abandon abandon abandon" }),
      })
    );
    expect(response.status).toBe(400);
    expect(getUnlockEnvelopeMock).not.toHaveBeenCalled();
  });

  it("returns envelope for password method", async () => {
    const { POST } = await import("@/app/api/vault/unlock-envelope/route");
    const response = await POST(
      new Request("http://localhost/api/vault/unlock-envelope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "password" }),
      })
    );
    expect(response.status).toBe(200);
    expect(getUnlockEnvelopeMock).toHaveBeenCalledWith(
      USER_ID,
      "password",
      expect.anything()
    );
  });
});
