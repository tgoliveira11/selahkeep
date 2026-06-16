import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  getVaultUnlockAuthOptions: vi.fn(),
  enableVaultUnlock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
}));

vi.mock("@/server/services/passkey-vault-envelope-service", () => ({
  passkeyVaultEnvelopeService: {
    getVaultUnlockAuthOptions: mocks.getVaultUnlockAuthOptions,
    enableVaultUnlock: mocks.enableVaultUnlock,
  },
}));

describe("enable vault unlock route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: "user-1", email: "user@test.local" });
  });

  it("returns auth options for vault unlock enablement", async () => {
    mocks.getVaultUnlockAuthOptions.mockResolvedValue({ challenge: "abc" });
    const { POST } = await import("@/app/api/account/passkeys/[id]/enable-vault-unlock/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "options" }),
      }),
      { params: Promise.resolve({ id: "cred-db-1" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.getVaultUnlockAuthOptions).toHaveBeenCalledWith(
      "user-1",
      "cred-db-1",
      expect.any(String)
    );
  });

  it("returns 400 for invalid enable-vault-unlock payload", async () => {
    const { POST } = await import("@/app/api/account/passkeys/[id]/enable-vault-unlock/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "verify" }),
      }),
      { params: Promise.resolve({ id: "cred-db-1" }) }
    );
    expect(res.status).toBe(400);
  });
});
