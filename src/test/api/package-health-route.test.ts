import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      health: {
        GET: vi.fn(async () =>
          Response.json({
            ok: true,
            package: "@tgoliveira/secure-auth",
            version: "0.1.25",
          })
        ),
      },
    },
  },
}));

describe("package health route", () => {
  it("re-exports secureAuth.routes.health.GET", async () => {
    const { GET } = await import("@/app/api/auth/package-health/route");
    const response = await GET();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.package).toBe("@tgoliveira/secure-auth");
    expect(body.version).toBe("0.1.25");
  });
});
