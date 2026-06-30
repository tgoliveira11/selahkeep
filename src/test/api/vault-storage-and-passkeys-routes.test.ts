import { describe, it, expect, vi, beforeEach } from "vitest";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  getStorageUsage: vi.fn(),
  listVaultUnlockCredentials: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/note-attachment-service", () => ({
  noteAttachmentService: {
    getStorageUsage: mocks.getStorageUsage,
  },
}));

vi.mock("@/server/services/passkey-service", () => ({
  passkeyService: {
    listVaultUnlockCredentials: mocks.listVaultUnlockCredentials,
  },
}));

describe("vault storage usage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    mocks.getStorageUsage.mockResolvedValue({ usedBytes: 1024, limitBytes: 1_000_000 });
  });

  it("GET returns storage usage for the signed-in user", async () => {
    const { GET } = await import("@/app/api/vault/storage-usage/route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ usedBytes: 1024, limitBytes: 1_000_000 });
    expect(mocks.getStorageUsage).toHaveBeenCalledWith(USER_ID);
  });
});

describe("passkeys vault-unlock list route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    mocks.listVaultUnlockCredentials.mockResolvedValue({ credentials: [] });
  });

  it("GET lists vault-unlock passkeys", async () => {
    const { GET } = await import("@/app/api/passkeys/vault-unlock/route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ credentials: [] });
    expect(mocks.listVaultUnlockCredentials).toHaveBeenCalledWith(USER_ID);
  });
});
