import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureSecureAuthDatabaseReady: vi.fn(),
}));

vi.mock("@/lib/secure-auth-schema", () => ({
  ensureSecureAuthDatabaseReady: mocks.ensureSecureAuthDatabaseReady,
}));

describe("secure-auth route wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureSecureAuthDatabaseReady.mockResolvedValue(undefined);
  });

  it("returns 503 with migration guidance when auth schema is not ready", async () => {
    mocks.ensureSecureAuthDatabaseReady.mockRejectedValue(
      new Error(
        "Auth database schema is missing users column(s): email_verified_at. Run `npm run db:migrate`."
      )
    );

    const { secureAuth } = await import("@/lib/secure-auth");
    const handler = secureAuth.routes.loginStart.POST;
    const res = await handler(new Request("http://localhost", { method: "POST", body: "{}" }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("email_verified_at"),
    });
  });

  it("delegates to the package handler when auth schema is ready", async () => {
    const { secureAuth } = await import("@/lib/secure-auth");
    const handler = secureAuth.routes.loginStart.POST;
    const res = await handler(new Request("http://localhost", { method: "POST", body: "{}" }));

    expect(mocks.ensureSecureAuthDatabaseReady).toHaveBeenCalledTimes(1);
    expect(res.status).not.toBe(503);
  });
});
