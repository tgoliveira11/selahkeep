import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getVaultUnlockMetadataForLogin: vi.fn(),
}));

vi.mock("@/server/services/passkey-login-vault-service", () => ({
  passkeyLoginVaultService: {
    getVaultUnlockMetadataForLogin: mocks.getVaultUnlockMetadataForLogin,
  },
}));

describe("passkey vault unlock metadata route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVaultUnlockMetadataForLogin.mockResolvedValue({
      vaultUnlockAvailable: true,
      encryptedVaultKey: { version: "enc-v1" },
      prfRequired: true,
    });
  });

  it("returns vault metadata for valid login token payload", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/vault-unlock/metadata/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ loginToken: "token", credentialId: "cred-id" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.getVaultUnlockMetadataForLogin).toHaveBeenCalledWith("token", "cred-id");
  });

  it("rejects PRF output in request body", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/vault-unlock/metadata/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          loginToken: "token",
          credentialId: "cred-id",
          prfOutput: "secret",
        }),
      })
    );
    expect(res.status).toBe(400);
    expect(mocks.getVaultUnlockMetadataForLogin).not.toHaveBeenCalled();
  });
});
