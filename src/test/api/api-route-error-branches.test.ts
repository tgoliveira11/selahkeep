import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as trustedDeviceStatusGet } from "@/app/api/trusted-devices/status/route";
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

vi.mock("@/server/services/trusted-device-service", () => ({
  trustedDeviceService: {
    getClientDeviceState: vi.fn(async () => ({
      state: "active",
      trustedDeviceId: "device-1",
    })),
  },
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    getStatus: vi.fn(async () => ({ initialized: true, recoveryState: "Protected" })),
    storeRecoveryCode: vi.fn(async () => ({ id: "recovery-env-1" })),
  },
}));

describe("API route error branches", () => {
  it("trusted device status validates deviceId query", async () => {
    const bad = await trustedDeviceStatusGet(
      new Request("http://localhost/api/trusted-devices/status?deviceId=not-a-uuid")
    );
    expect(bad.status).toBe(400);

    const ok = await trustedDeviceStatusGet(
      new Request(
        `http://localhost/api/trusted-devices/status?deviceId=550e8400-e29b-41d4-a716-446655440000`
      )
    );
    expect(ok.status).toBe(200);
  });

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
