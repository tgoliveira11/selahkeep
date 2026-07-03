import { describe, it, expect, vi, beforeEach } from "vitest";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  getStorageUsage: vi.fn(),
  listVaultUnlockCredentials: vi.fn(),
  readVaultDeviceBindingIdFromCookies: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
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

vi.mock("@/lib/passkey/vault-device-binding-cookie", () => ({
  readVaultDeviceBindingIdFromCookies: mocks.readVaultDeviceBindingIdFromCookies,
}));

describe("vault storage usage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
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
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    mocks.readVaultDeviceBindingIdFromCookies.mockResolvedValue("binding-1");
    mocks.listVaultUnlockCredentials.mockResolvedValue({
      passkeys: [],
      deviceBindings: [],
      currentDeviceCredentialId: null,
      serverEnvelopeConfigured: true,
    });
  });

  it("GET lists vault-unlock passkeys with device binding context", async () => {
    const { GET } = await import("@/app/api/passkeys/vault-unlock/route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      serverEnvelopeConfigured: true,
    });
    expect(mocks.listVaultUnlockCredentials).toHaveBeenCalledWith(USER_ID, "binding-1");
  });
});
