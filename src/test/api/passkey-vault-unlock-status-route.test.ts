import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  getVaultUnlockStatus: vi.fn(),
  disableVaultUnlock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
}));

vi.mock("@/server/services/passkey-vault-envelope-service", () => ({
  passkeyVaultEnvelopeService: {
    getVaultUnlockStatus: mocks.getVaultUnlockStatus,
    disableVaultUnlock: mocks.disableVaultUnlock,
  },
}));

describe("passkey vault unlock status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: "user-1" });
    mocks.getVaultUnlockStatus.mockResolvedValue({
      signInEnabled: true,
      vaultUnlockEnabled: true,
      prfSupported: true,
      credentialId: "cred-1",
    });
    mocks.disableVaultUnlock.mockResolvedValue({ success: true });
  });

  it("GET returns vault unlock status for passkey", async () => {
    const { GET } = await import("@/app/api/account/passkeys/[id]/vault-unlock/route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "db-id-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.getVaultUnlockStatus).toHaveBeenCalledWith("user-1", "db-id-1");
  });

  it("DELETE revokes passkey vault unlock envelope", async () => {
    const { DELETE } = await import("@/app/api/account/passkeys/[id]/vault-unlock/route");
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "db-id-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.disableVaultUnlock).toHaveBeenCalledWith("user-1", "db-id-1");
  });
});
