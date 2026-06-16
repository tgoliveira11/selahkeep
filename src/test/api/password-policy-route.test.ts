import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      passwordPolicy: {
        GET: vi.fn(async () =>
          Response.json({
            enforcement: "warn",
            minLength: 12,
          })
        ),
      },
    },
  },
}));

describe("password policy route", () => {
  it("re-exports secureAuth.routes.passwordPolicy.GET", async () => {
    const { GET } = await import("@/app/api/auth/password-policy/route");
    const response = await GET();
    const body = await response.json();
    expect(body.enforcement).toBe("warn");
    expect(body.minLength).toBe(12);
  });
});
