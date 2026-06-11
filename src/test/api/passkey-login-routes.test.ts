import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as optionsPost } from "@/app/api/auth/passkey/login/options/route";
import { POST as verifyPost } from "@/app/api/auth/passkey/login/verify/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getLoginOptions: vi.fn(),
  verifyLogin: vi.fn(),
  getLoginVaultUnlockOptions: vi.fn(),
}));

vi.mock("@/server/services/passkey-login-service", () => ({
  passkeyLoginService: {
    getLoginOptions: mocks.getLoginOptions,
    verifyLogin: mocks.verifyLogin,
    getLoginVaultUnlockOptions: mocks.getLoginVaultUnlockOptions,
  },
}));

describe("passkey login API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns login options", async () => {
    mocks.getLoginOptions.mockResolvedValue({
      options: { challenge: "abc" },
      prfIncluded: false,
    });
    const res = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(200);
  });

  it("returns login verify result with login token", async () => {
    mocks.verifyLogin.mockResolvedValue({
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
      vaultUnlockAvailable: false,
      encryptedVaultKey: null,
      prfRequired: true,
    });
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.loginToken).toBe("token");
  });

  it("rejects invalid verify payload", async () => {
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects reused challenge via service error", async () => {
    const { ChallengeError } = await import("@/server/services/passkey-service");
    mocks.verifyLogin.mockRejectedValue(new ChallengeError("Invalid or expired challenge"));
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid vault unlock options payload", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/vault-unlock/options/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ loginToken: "token" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns vault unlock PRF options", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/vault-unlock/options/route");
    mocks.getLoginVaultUnlockOptions.mockResolvedValue({
      options: { challenge: "vault" },
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      prfRequired: true,
    });
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ loginToken: "token", credentialId: "cred-id" }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("does not return plaintext vault key", async () => {
    mocks.verifyLogin.mockResolvedValue({
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
      vaultUnlockAvailable: true,
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      prfRequired: true,
    });
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
    );
    const text = await res.text();
    expect(text).not.toContain("SENTINEL-PRIVATE-LETTER");
    expect(text).toContain("ciphertext");
  });
});
