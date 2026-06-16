import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  ensureSecureAuthDatabaseReady: vi.fn(),
  passkeyLoginOptionsPost: vi.fn(),
  passkeyLoginVerifyPost: vi.fn(),
  getLoginVaultUnlockOptions: vi.fn(),
}));

vi.mock("@/lib/secure-auth-schema", () => ({
  ensureSecureAuthDatabaseReady: mocks.ensureSecureAuthDatabaseReady,
}));

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      passkeyLoginOptions: {
        POST: mocks.passkeyLoginOptionsPost,
      },
      passkeyLoginVerify: {
        POST: mocks.passkeyLoginVerifyPost,
      },
    },
  },
}));

vi.mock("@/server/services/passkey-login-service", () => ({
  passkeyLoginService: {
    getLoginVaultUnlockOptions: mocks.getLoginVaultUnlockOptions,
  },
}));

describe("passkey login API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureSecureAuthDatabaseReady.mockResolvedValue(undefined);
  });

  it("delegates login options to the package route", async () => {
    const { POST: optionsPost } = await import("@/app/api/auth/passkey/login/options/route");
    mocks.passkeyLoginOptionsPost.mockResolvedValue(
      new Response(JSON.stringify({ options: { challenge: "abc" }, prfIncluded: false }), {
        status: 200,
      })
    );

    const res = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.passkeyLoginOptionsPost).toHaveBeenCalledTimes(1);
  });

  it("delegates login verify to the package route", async () => {
    const { POST: verifyPost } = await import("@/app/api/auth/passkey/login/verify/route");
    mocks.passkeyLoginVerifyPost.mockResolvedValue(
      new Response(
        JSON.stringify({
          loginToken: "token",
          userId: USER_ID,
          credentialId: "cred-id",
        }),
        { status: 200 }
      )
    );

    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.loginToken).toBe("token");
    expect(mocks.passkeyLoginVerifyPost).toHaveBeenCalledTimes(1);
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

  it("returns vault unlock PRF options from the product route", async () => {
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
});
