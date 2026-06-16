import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  where: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
  },
}));

describe("loginTokenRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ limit: mocks.limit });
  });

  it("returns a valid login token row", async () => {
    mocks.limit.mockResolvedValue([{ userId: "user-1", tokenHash: "abc" }]);
    const { loginTokenRepository } = await import(
      "@/modules/auth/repositories/login-token-repository"
    );
    const row = await loginTokenRepository.findValidLoginToken("abc");
    expect(row?.userId).toBe("user-1");
  });

  it("returns null when no valid token exists", async () => {
    mocks.limit.mockResolvedValue([]);
    const { loginTokenRepository } = await import(
      "@/modules/auth/repositories/login-token-repository"
    );
    await expect(loginTokenRepository.findValidLoginToken("missing")).resolves.toBeNull();
  });
});
