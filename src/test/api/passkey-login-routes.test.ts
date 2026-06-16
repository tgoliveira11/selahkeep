import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  ensureSecureAuthDatabaseReady: vi.fn(),
  passkeyLoginOptionsPost: vi.fn(),
  passkeyLoginVerifyPost: vi.fn(),
  getServices: vi.fn(),
  issueLoginToken: vi.fn(),
  recordLoginSuccess: vi.fn(),
  getLoginVaultUnlockOptions: vi.fn(),
  getVaultUnlockMetadataForCredential: vi.fn(),
  enrichLoginOptionsWithVaultPrf: vi.fn(),
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
    getServices: mocks.getServices,
  },
}));

vi.mock("@/server/services/passkey-login-service", () => ({
  optionsIncludePrf: (options: unknown) =>
    Boolean(
      options &&
        typeof options === "object" &&
        "extensions" in options &&
        (options as { extensions?: { prf?: unknown } }).extensions?.prf
    ),
  passkeyLoginService: {
    getLoginVaultUnlockOptions: mocks.getLoginVaultUnlockOptions,
    getVaultUnlockMetadataForCredential: mocks.getVaultUnlockMetadataForCredential,
    enrichLoginOptionsWithVaultPrf: mocks.enrichLoginOptionsWithVaultPrf,
  },
}));

describe("passkey login API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureSecureAuthDatabaseReady.mockResolvedValue(undefined);
    mocks.getServices.mockResolvedValue({
      authLoginService: { issueLoginToken: mocks.issueLoginToken },
      authService: { recordLoginSuccess: mocks.recordLoginSuccess },
    });
    mocks.issueLoginToken.mockResolvedValue("issued-token");
    mocks.recordLoginSuccess.mockResolvedValue(undefined);
  });

  it("enriches login options with prfIncluded", async () => {
    const { POST: optionsPost } = await import("@/app/api/auth/passkey/login/options/route");
    mocks.passkeyLoginOptionsPost.mockResolvedValue(
      new Response(JSON.stringify({ options: { challenge: "abc" } }), { status: 200 })
    );
    mocks.enrichLoginOptionsWithVaultPrf.mockImplementation(
      async (_input, options: { challenge: string; extensions?: unknown }) => ({
        ...options,
        extensions: { prf: { eval: { first: "salt" } } },
      })
    );

    const res = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ credentialId: "cred-id", userId: USER_ID }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.prfIncluded).toBe(true);
    expect(mocks.enrichLoginOptionsWithVaultPrf).toHaveBeenCalledWith(
      { credentialId: "cred-id", userId: USER_ID },
      { challenge: "abc" }
    );
  });

  it("enriches login verify with vault unlock metadata", async () => {
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
    mocks.getVaultUnlockMetadataForCredential.mockResolvedValue({
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
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.loginToken).toBe("token");
    expect(body.vaultUnlockAvailable).toBe(true);
    expect(body.encryptedVaultKey).toBeTruthy();
    expect(mocks.getVaultUnlockMetadataForCredential).toHaveBeenCalledWith(USER_ID, "cred-id");
  });

  it("issues loginToken when package requires 2FA (passkey bypasses TOTP)", async () => {
    const { POST: verifyPost } = await import("@/app/api/auth/passkey/login/verify/route");
    mocks.passkeyLoginVerifyPost.mockResolvedValue(
      new Response(
        JSON.stringify({
          requiresTwoFactor: true,
          challengeToken: "challenge-token",
          userId: USER_ID,
          credentialId: "cred-id",
        }),
        { status: 200 }
      )
    );
    mocks.getVaultUnlockMetadataForCredential.mockResolvedValue({
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
    expect(body.loginToken).toBe("issued-token");
    expect(body.userId).toBe(USER_ID);
    expect(body.credentialId).toBe("cred-id");
    expect(body.vaultUnlockAvailable).toBe(false);
    expect(mocks.issueLoginToken).toHaveBeenCalledWith(USER_ID, "passkey");
    expect(mocks.recordLoginSuccess).toHaveBeenCalledWith(USER_ID, "passkey");
    expect(mocks.getVaultUnlockMetadataForCredential).toHaveBeenCalledWith(USER_ID, "cred-id");
  });

  it("returns 500 when package verify succeeds without loginToken or 2FA challenge", async () => {
    const { POST: verifyPost } = await import("@/app/api/auth/passkey/login/verify/route");
    mocks.passkeyLoginVerifyPost.mockResolvedValue(
      new Response(JSON.stringify({ userId: USER_ID, credentialId: "cred-id" }), { status: 200 })
    );

    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeTruthy();
    expect(mocks.getVaultUnlockMetadataForCredential).not.toHaveBeenCalled();
  });

  it("passes through package verify errors without enrichment", async () => {
    const { POST: verifyPost } = await import("@/app/api/auth/passkey/login/verify/route");
    mocks.passkeyLoginVerifyPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid" }), { status: 401 })
    );

    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
    );

    expect(res.status).toBe(401);
    expect(mocks.getVaultUnlockMetadataForCredential).not.toHaveBeenCalled();
  });

  it("marks options without PRF as prfIncluded false", async () => {
    const { POST: optionsPost } = await import("@/app/api/auth/passkey/login/options/route");
    mocks.passkeyLoginOptionsPost.mockResolvedValue(
      new Response(JSON.stringify({ options: { challenge: "abc" } }), { status: 200 })
    );
    mocks.enrichLoginOptionsWithVaultPrf.mockResolvedValue({ challenge: "abc" });

    const res = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    const body = await res.json();
    expect(body.prfIncluded).toBe(false);
  });

  it("passes through package options errors", async () => {
    const { POST: optionsPost } = await import("@/app/api/auth/passkey/login/options/route");
    mocks.passkeyLoginOptionsPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "bad" }), { status: 400 })
    );

    const res = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
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
