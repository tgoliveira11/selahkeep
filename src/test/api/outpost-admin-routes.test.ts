import { describe, it, expect } from "vitest";

const delegateRoutes = [
  ["outpost admin queue", () => import("@/app/api/outpost/admin/queue/route")],
  ["outpost admin worker send", () => import("@/app/api/outpost/admin/worker/send/route")],
  ["outpost admin config", () => import("@/app/api/outpost/admin/config/route")],
  ["outpost admin observability", () => import("@/app/api/outpost/admin/observability/route")],
] as const;

describe("outpost admin delegate API routes", () => {
  it.each(delegateRoutes)("loads %s route exports", async (_label, loadRoute) => {
    const route = await loadRoute();
    const handlers = Object.values(route).filter((value) => typeof value === "function");
    expect(handlers.length).toBeGreaterThan(0);
  });
});
