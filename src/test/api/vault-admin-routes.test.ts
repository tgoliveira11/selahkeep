import { describe, it, expect } from "vitest";

const delegateRoutes = [
  ["vault admin config", () => import("@/app/api/vault/admin/config/route")],
] as const;

describe("vault admin delegate API routes", () => {
  it.each(delegateRoutes)("loads %s route exports", async (_label, loadRoute) => {
    const route = await loadRoute();
    const handlers = Object.values(route).filter((value) => typeof value === "function");
    expect(handlers.length).toBeGreaterThan(0);
  });
});
