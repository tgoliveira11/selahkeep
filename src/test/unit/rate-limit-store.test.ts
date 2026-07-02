import { describe, expect, it } from "vitest";
import { resolveRateLimitStore } from "@/lib/env/rate-limit-store";

describe("resolveRateLimitStore", () => {
  it("defaults to memory in development", () => {
    expect(resolveRateLimitStore({ NODE_ENV: "development" })).toBe("memory");
  });

  it("defaults to postgres in production when unset", () => {
    expect(resolveRateLimitStore({ NODE_ENV: "production" })).toBe("postgres");
  });

  it("honors AUTH_RATE_LIMIT_STORE over production default", () => {
    expect(
      resolveRateLimitStore({
        NODE_ENV: "production",
        AUTH_RATE_LIMIT_STORE: "memory",
      })
    ).toBe("memory");
  });

  it("falls back to RATE_LIMIT_STORE when AUTH_RATE_LIMIT_STORE is unset", () => {
    expect(
      resolveRateLimitStore({
        NODE_ENV: "development",
        RATE_LIMIT_STORE: "postgres",
      })
    ).toBe("postgres");
  });
});
