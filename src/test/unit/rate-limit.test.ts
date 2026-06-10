import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/server/policies/rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimit("test-key");
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    expect(checkRateLimit("test-key", 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit("test-key", 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit("test-key", 3, 60_000).allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    checkRateLimit("test-key", 2, 60_000);
    checkRateLimit("test-key", 2, 60_000);
    const blocked = checkRateLimit("test-key", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    checkRateLimit("test-key", 1, 1000);
    expect(checkRateLimit("test-key", 1, 1000).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("test-key", 1, 1000).allowed).toBe(true);
  });

  it("resetRateLimit clears the bucket", () => {
    checkRateLimit("test-key", 1, 60_000);
    expect(checkRateLimit("test-key", 1, 60_000).allowed).toBe(false);
    resetRateLimit("test-key");
    expect(checkRateLimit("test-key", 1, 60_000).allowed).toBe(true);
  });
});
