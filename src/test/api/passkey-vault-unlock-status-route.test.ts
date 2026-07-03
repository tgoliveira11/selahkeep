import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  getVaultUnlockStatus: vi.fn(),
  getManageVaultUnlockAuthOptions: vi.fn(),
  disableVaultUnlockWithProof: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
}));

vi.mock("@/server/services/passkey-vault-envelope-service", () => ({
  passkeyVaultEnvelopeService: {
    getVaultUnlockStatus: mocks.getVaultUnlockStatus,
    getManageVaultUnlockAuthOptions: mocks.getManageVaultUnlockAuthOptions,
    disableVaultUnlockWithProof: mocks.disableVaultUnlockWithProof,
  },
}));

vi.mock("@/lib/passkey/vault-device-binding-cookie", () => ({
  readVaultDeviceBindingIdFromCookies: vi.fn(async () => undefined),
  clearVaultDeviceBindingCookie: vi.fn((response: Response) => response),
}));

describe("passkey vault unlock status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.getVaultUnlockStatus.mockResolvedValue({
      signInEnabled: true,
      vaultUnlockEnabled: true,
      prfSupported: true,
      credentialId: "cred-1",
    });
    mocks.getManageVaultUnlockAuthOptions.mockResolvedValue({ challenge: "abc" });
    mocks.disableVaultUnlockWithProof.mockResolvedValue({ success: true, removedBindingId: null });
  });

  it("GET returns vault unlock status for passkey", async () => {
    const { GET } = await import("@/app/api/account/passkeys/[id]/vault-unlock/route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "db-id-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.getVaultUnlockStatus).toHaveBeenCalledWith("user-1", "db-id-1");
  });

  it("DELETE without PRF proof is rejected", async () => {
    const { DELETE } = await import("@/app/api/account/passkeys/[id]/vault-unlock/route");
    const res = await DELETE(
      new Request("http://localhost", { method: "DELETE", body: "{}" }),
      { params: Promise.resolve({ id: "db-id-1" }) }
    );
    expect(res.status).toBe(400);
    expect(mocks.disableVaultUnlockWithProof).not.toHaveBeenCalled();
  });

  it("DELETE with PRF proof revokes passkey vault unlock envelope", async () => {
    const { DELETE } = await import("@/app/api/account/passkeys/[id]/vault-unlock/route");
    const res = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({
          prfVaultEnvelope: true,
          response: { id: "cred-1", response: {}, clientExtensionResults: { prf: { results: { first: "x" } } } },
        }),
      }),
      { params: Promise.resolve({ id: "db-id-1" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.disableVaultUnlockWithProof).toHaveBeenCalledWith(
      "user-1",
      "db-id-1",
      expect.objectContaining({ id: "cred-1" })
    );
  });

  it("POST disable-options returns management auth options", async () => {
    const { POST } = await import("@/app/api/account/passkeys/[id]/vault-unlock/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "disable-options" }),
      }),
      { params: Promise.resolve({ id: "db-id-1" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.getManageVaultUnlockAuthOptions).toHaveBeenCalledWith(
      "user-1",
      "db-id-1",
      expect.anything()
    );
  });

  it("POST disable-verify revokes passkey vault unlock with PRF proof", async () => {
    const { POST } = await import("@/app/api/account/passkeys/[id]/vault-unlock/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          action: "disable-verify",
          prfVaultEnvelope: true,
          response: { id: "cred-1", response: {}, clientExtensionResults: { prf: { results: { first: "x" } } } },
        }),
      }),
      { params: Promise.resolve({ id: "db-id-1" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.disableVaultUnlockWithProof).toHaveBeenCalled();
  });

  it("rejects disable-verify when forbidden plaintext fields are present", async () => {
    const { POST } = await import("@/app/api/account/passkeys/[id]/vault-unlock/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          action: "disable-verify",
          prfVaultEnvelope: true,
          prfOutput: "secret",
          response: { id: "cred-1" },
        }),
      }),
      { params: Promise.resolve({ id: "db-id-1" }) }
    );
    expect(res.status).toBe(400);
  });
});
