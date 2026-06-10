import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/recovery-code/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  storeRecoveryCode: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    storeRecoveryCode: mocks.storeRecoveryCode,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("recovery code API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("stores recovery envelope", async () => {
    mocks.storeRecoveryCode.mockResolvedValue({ id: "env-1" });
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
        }),
      })
    );
    expect(res.status).toBe(201);
  });
});
