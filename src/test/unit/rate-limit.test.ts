import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  setRateLimitAdapterForTests,
  buildRateLimitKey,
  enforceRateLimit,
  RateLimitError,
} from "@/server/policies/rate-limit";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "@/server/policies/rate-limit/in-memory-adapter";

describe("rate limit abstraction", () => {
  beforeEach(() => {
    resetAllInMemoryRateLimits();
    setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
    vi.useRealTimers();
  });

  it("builds scoped keys without global lockout keys", () => {
    const userA = buildRateLimitKey({
      operation: "auth.login",
      userId: "user-a",
      ip: "1.1.1.1",
      endpoint: "/api/auth/callback/credentials",
    });
    const userB = buildRateLimitKey({
      operation: "auth.login",
      userId: "user-b",
      ip: "1.1.1.1",
      endpoint: "/api/auth/callback/credentials",
    });
    expect(userA).not.toEqual(userB);
    expect(userA).toContain("user-a");
    expect(userB).toContain("user-b");
  });

  it("limits per user independently", async () => {
    const scopeA = {
      operation: "auth.login" as const,
      userId: "user-a",
      ip: "1.1.1.1",
      endpoint: "/api/auth/callback/credentials",
    };
    const scopeB = { ...scopeA, userId: "user-b" };

    for (let i = 0; i < 20; i++) {
      expect((await checkRateLimit(scopeA)).allowed).toBe(true);
    }
    expect((await checkRateLimit(scopeA)).allowed).toBe(false);
    expect((await checkRateLimit(scopeB)).allowed).toBe(true);
  });

  it("limits per IP independently for registration", async () => {
    const ipA = {
      operation: "auth.register" as const,
      ip: "1.1.1.1",
      endpoint: "/api/auth/register",
    };
    const ipB = { ...ipA, ip: "2.2.2.2" };

    for (let i = 0; i < 10; i++) {
      expect((await checkRateLimit(ipA)).allowed).toBe(true);
    }
    expect((await checkRateLimit(ipA)).allowed).toBe(false);
    expect((await checkRateLimit(ipB)).allowed).toBe(true);
  });

  it("limits per endpoint independently", async () => {
    const registerScope = {
      operation: "passkey.register" as const,
      userId: "user-1",
      ip: "1.1.1.1",
      endpoint: "/api/passkeys/register",
    };
    const authScope = {
      operation: "passkey.authenticate" as const,
      userId: "user-1",
      ip: "1.1.1.1",
      endpoint: "/api/passkeys/authenticate",
    };

    for (let i = 0; i < 10; i++) {
      expect((await checkRateLimit(registerScope)).allowed).toBe(true);
    }
    expect((await checkRateLimit(registerScope)).allowed).toBe(false);
    expect((await checkRateLimit(authScope)).allowed).toBe(true);
  });

  it("resets a scoped bucket", async () => {
    const scope = {
      operation: "account.delete" as const,
      userId: "user-1",
      ip: "1.1.1.1",
      endpoint: "/api/account",
    };
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(scope);
    }
    expect((await checkRateLimit(scope)).allowed).toBe(false);
    await resetRateLimit(scope);
    expect((await checkRateLimit(scope)).allowed).toBe(true);
  });

  it("enforceRateLimit throws RateLimitError when blocked", async () => {
    const scope = {
      operation: "recovery.attempt" as const,
      userId: "user-1",
      endpoint: "/api/vault/unlock-with-recovery-code",
    };
    for (let i = 0; i < 5; i++) {
      await enforceRateLimit(scope);
    }
    await expect(enforceRateLimit(scope)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("uses in-memory adapter in test environment by default", async () => {
    const scope = {
      operation: "vault.unlock" as const,
      userId: "user-1",
      ip: "127.0.0.1",
      endpoint: "/api/vault/unlock-with-recovery-code",
    };
    expect((await checkRateLimit(scope)).allowed).toBe(true);
  });
});
