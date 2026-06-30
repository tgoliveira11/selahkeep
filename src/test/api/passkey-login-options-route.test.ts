import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      passkeyLoginOptions: {
        POST: vi.fn(async () => Response.json({ challenge: "abc" })),
      },
    },
  },
}));

describe("passkey login options route", () => {
  it("re-exports secureAuth.routes.passkeyLoginOptions.POST", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/options/route");
    const response = await POST(new Request("http://localhost", { method: "POST" }));
    const body = await response.json();
    expect(body.challenge).toBe("abc");
  });
});
