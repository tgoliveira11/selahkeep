import { describe, it, expect, vi } from "vitest";
import { GET as vaultStatusGet } from "@/app/api/vault/status/route";
import { POST as recoveryCodePost } from "@/app/api/recovery-code/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const sessionUser = { id: USER_ID, email: "user@example.com" };

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: vi.fn(async () => sessionUser),
  requireFullyAuthenticatedUser: vi.fn(async () => sessionUser),
  getSessionUser: vi.fn(async () => sessionUser),
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    getStatus: vi.fn(async () => ({ initialized: true, recoveryState: "Protected" })),
    storeRecoveryCode: vi.fn(async () => ({ id: "recovery-env-1" })),
  },
}));

describe("API route error branches", () => {
  it("vault status and recovery-code routes return success", async () => {
    expect((await vaultStatusGet()).status).toBe(200);
    const recovery = await recoveryCodePost(
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
    expect(recovery.status).toBe(201);
  });
});
