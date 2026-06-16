import { describe, it, expect, vi, beforeEach } from "vitest";
import { optionsIncludePrf } from "@/server/services/passkey-login-vault-service";

const mocks = vi.hoisted(() => ({
  enrichLoginOptionsWithVaultPrf: vi.fn(),
  passkeyLoginOptionsPost: vi.fn(),
}));

vi.mock("@/server/services/passkey-login-vault-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/passkey-login-vault-service")>();
  return {
    ...actual,
    passkeyLoginVaultService: {
      enrichLoginOptionsWithVaultPrf: mocks.enrichLoginOptionsWithVaultPrf,
    },
  };
});

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      passkeyLoginOptions: { POST: mocks.passkeyLoginOptionsPost },
    },
  },
}));

describe("passkey login options route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.passkeyLoginOptionsPost.mockResolvedValue(
      new Response(JSON.stringify({ options: { challenge: "abc" } }), { status: 200 })
    );
    mocks.enrichLoginOptionsWithVaultPrf.mockResolvedValue({
      challenge: "abc",
      extensions: { prf: { eval: { first: "salt" } } },
    });
  });

  it("delegates to package options then enriches with vault PRF", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/options/route");
    const res = await POST(
      new Request("http://localhost/api/auth/passkey/login/options", {
        method: "POST",
        body: JSON.stringify({ email: "user@test.local" }),
      })
    );
    expect(mocks.passkeyLoginOptionsPost).toHaveBeenCalledTimes(1);
    expect(mocks.enrichLoginOptionsWithVaultPrf).toHaveBeenCalled();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prfIncluded).toBe(true);
  });
});

describe("optionsIncludePrf", () => {
  it("detects PRF extension presence", () => {
    expect(optionsIncludePrf({ extensions: { prf: { eval: { first: "x" } } } })).toBe(true);
    expect(optionsIncludePrf({ extensions: {} })).toBe(false);
  });
});
