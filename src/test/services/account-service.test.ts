import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountService, NotFoundError } from "@/server/services/account-service";
import { USER_ID } from "@/test/helpers/fixtures";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "@/server/policies/rate-limit/in-memory-adapter";
import { setRateLimitAdapterForTests } from "@/server/policies/rate-limit";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  deleteById: vi.fn(),
  record: vi.fn(),
  runInTransaction: vi.fn(),
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: {
    findById: mocks.findById,
    deleteById: mocks.deleteById,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: mocks.runInTransaction,
}));

describe("account deletion service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllInMemoryRateLimits();
    setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
    mocks.findById.mockResolvedValue({ id: USER_ID, email: "user@test.local" });
    mocks.runInTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({})
    );
    mocks.deleteById.mockResolvedValue({ id: USER_ID });
  });

  it("deletes account and records audit event", async () => {
    const result = await accountService.deleteAccount(USER_ID, "127.0.0.1");
    expect(result).toEqual({ success: true });
    expect(mocks.record).toHaveBeenCalledWith(
      "account_deletion_requested",
      USER_ID,
      expect.objectContaining({ endpoint: "/api/account" })
    );
    expect(mocks.deleteById).toHaveBeenCalledWith(USER_ID, expect.anything());
  });

  it("throws when account is missing", async () => {
    mocks.findById.mockResolvedValue(null);
    await expect(accountService.deleteAccount(USER_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rate limits repeated deletion attempts", async () => {
    for (let i = 0; i < 3; i++) {
      await accountService.deleteAccount(USER_ID, "127.0.0.1");
    }
    mocks.findById.mockResolvedValue({ id: USER_ID, email: "user@test.local" });
    await expect(accountService.deleteAccount(USER_ID, "127.0.0.1")).rejects.toMatchObject({
      name: "RateLimitError",
    });
  });
});
