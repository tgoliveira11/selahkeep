import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as statusGet } from "@/app/api/vault/status/route";
import { POST as initPost } from "@/app/api/vault/init/route";
import { POST as recoveryUnlockPost } from "@/app/api/vault/unlock-with-recovery-code/route";
import { GET as deviceEnvelopesGet } from "@/app/api/vault/device-envelopes/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  getStatus: vi.fn(),
  init: vi.fn(),
  unlockWithRecoveryCode: vi.fn(),
  getTrustedDeviceEnvelopes: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    getStatus: mocks.getStatus,
    init: mocks.init,
    unlockWithRecoveryCode: mocks.unlockWithRecoveryCode,
    getTrustedDeviceEnvelopes: mocks.getTrustedDeviceEnvelopes,
  },
  ConflictError: class ConflictError extends Error {
    name = "ConflictError";
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
  RateLimitError: class RateLimitError extends Error {
    name = "RateLimitError";
  },
}));

describe("vault API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET /vault/status returns vault status", async () => {
    mocks.getStatus.mockResolvedValue({ initialized: true, recoveryState: "Basic" });
    const res = await statusGet();
    expect(res.status).toBe(200);
  });

  it("POST /vault/init creates vault", async () => {
    mocks.init.mockResolvedValue({ id: "vault-1" });
    const res = await initPost(
      new Request("http://localhost/api/vault/init", {
        method: "POST",
        body: JSON.stringify({
          vaultVersion: "vault-v1",
          envelopes: [
            {
              method: "trusted_device",
              encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
            },
          ],
        }),
      })
    );
    expect(res.status).toBe(201);
  });

  it("POST /vault/unlock-with-recovery-code returns envelope", async () => {
    mocks.unlockWithRecoveryCode.mockResolvedValue({
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      kdfMetadata: {},
    });
    const res = await recoveryUnlockPost(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
  });

  it("GET /vault/device-envelopes returns trusted device envelopes", async () => {
    mocks.getTrustedDeviceEnvelopes.mockResolvedValue([]);
    const res = await deviceEnvelopesGet();
    expect(res.status).toBe(200);
  });
});
