import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "@/server/services/auth-service";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "@/server/policies/rate-limit/in-memory-adapter";
import { setRateLimitAdapterForTests, RateLimitError } from "@/server/policies/rate-limit";

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

describe("auth service", () => {
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

  it("blocks login after too many attempts for the same email scope", async () => {
    for (let i = 0; i < 20; i++) {
      await authService.assertLoginAllowed("user@example.com", "127.0.0.1");
    }
    await expect(
      authService.assertLoginAllowed("user@example.com", "127.0.0.1")
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
