import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/vault/settings/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    getSettings: mocks.getSettings,
    updateSettings: mocks.updateSettings,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("vault settings API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET returns encrypted settings", async () => {
    const settings = encryptedPayload("vault_settings", USER_ID);
    mocks.getSettings.mockResolvedValue({ encryptedVaultSettings: settings });
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ encryptedVaultSettings: settings });
  });

  it("PATCH rejects plaintext unlockBehavior", async () => {
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ unlockBehavior: "decrypt_all" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("PATCH updates encrypted settings", async () => {
    const settings = encryptedPayload("vault_settings", USER_ID);
    mocks.updateSettings.mockResolvedValue({ encryptedVaultSettings: settings });
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ encryptedVaultSettings: settings }),
      })
    );
    expect(res.status).toBe(200);
  });
});
