import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "@/server/services/auth-service";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "@/server/policies/rate-limit/in-memory-adapter";
import {
  setRateLimitAdapterForTests,
  RateLimitError,
  buildRateLimitKey,
} from "@/server/policies/rate-limit";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: { findByEmail: mocks.findByEmail },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

describe("auth service login rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllInMemoryRateLimits();
    setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
  });

  it("records login success", async () => {
    await authService.recordLoginSuccess("user-1", "credentials");
    expect(mocks.record).toHaveBeenCalledWith("login_success", "user-1", {
      provider: "credentials",
      endpoint: "/api/auth/callback",
    });
  });

  it("records login failure without sensitive content", async () => {
    mocks.findByEmail.mockResolvedValue({ id: "user-1" });
    await authService.recordLoginFailure("user@example.com");
    expect(mocks.record).toHaveBeenCalledWith("login_failure", "user-1", {
      endpoint: "/api/auth/callback/credentials",
      errorCode: "invalid_credentials",
    });
  });

  it("uses separate email, IP, and composite keys", () => {
    const emailKey = buildRateLimitKey({
      operation: "auth.login",
      userId: "user@example.com",
      endpoint: "/api/auth/callback/credentials",
      keyMode: "email",
    });
    const ipKey = buildRateLimitKey({
      operation: "auth.login",
      ip: "203.0.113.10",
      endpoint: "/api/auth/callback/credentials",
      keyMode: "ip",
    });
    const compositeKey = buildRateLimitKey({
      operation: "auth.login",
      userId: "user@example.com",
      ip: "203.0.113.10",
      endpoint: "/api/auth/callback/credentials",
      keyMode: "email_ip",
    });

    expect(emailKey).toContain("email:user@example.com");
    expect(ipKey).toContain("ip:203.0.113.10");
    expect(compositeKey).toContain("email:user@example.com");
    expect(compositeKey).toContain("ip:203.0.113.10");
    expect(emailKey).not.toEqual(ipKey);
  });

  it("blocks login after too many attempts for the same email scope", async () => {
    for (let i = 0; i < 20; i++) {
      await authService.assertLoginAllowed("user@example.com", "127.0.0.1");
    }
    await expect(
      authService.assertLoginAllowed("user@example.com", "127.0.0.1")
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("rate limits email scope when IP is unavailable", async () => {
    for (let i = 0; i < 20; i++) {
      await authService.assertLoginAllowed("user@example.com");
    }
    await expect(authService.assertLoginAllowed("user@example.com")).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it("does not lock out other emails from a different IP", async () => {
    for (let i = 0; i < 20; i++) {
      await authService.assertLoginAllowed("attacker@example.com", "203.0.113.10");
    }
    await expect(
      authService.assertLoginAllowed("victim@example.com", "198.51.100.4")
    ).resolves.toBeUndefined();
  });

  it("blocks repeated attempts for the same IP scope", async () => {
    for (let i = 0; i < 20; i++) {
      await authService.assertLoginAllowed(`user${i}@example.com`, "203.0.113.10");
    }
    await expect(
      authService.assertLoginAllowed("another@example.com", "203.0.113.10")
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
