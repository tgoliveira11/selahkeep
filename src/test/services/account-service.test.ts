import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountService, NotFoundError, ReauthenticationRequiredError, ValidationError } from "@/server/services/account-service";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";
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
  verifyPassword: vi.fn(),
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

vi.mock("@/server/policies/password-hashing", () => ({
  verifyPassword: mocks.verifyPassword,
}));

describe("account deletion service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllInMemoryRateLimits();
    setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
    mocks.findById.mockResolvedValue({
      id: USER_ID,
      email: "user@test.local",
      authProvider: "credentials",
      passwordHash: "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.runInTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({})
    );
    mocks.deleteById.mockResolvedValue({ id: USER_ID });
  });

  it("returns deletion requirements", async () => {
    const requirements = await accountService.getDeletionRequirements(USER_ID);
    expect(requirements.requiresPassword).toBe(true);
    expect(requirements.confirmationPhrase).toBe(ACCOUNT_DELETION_CONFIRMATION_PHRASE);
  });

  it("allows OAuth-only deletion with confirmation phrase and active session", async () => {
    mocks.findById.mockResolvedValue({
      id: USER_ID,
      email: "oauth@test.local",
      authProvider: "google",
      passwordHash: null,
    });

    const result = await accountService.deleteAccount(
      USER_ID,
      { confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE },
      "127.0.0.1"
    );
    expect(result.success).toBe(true);
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("requires matching confirmation phrase", async () => {
    await expect(
      accountService.deleteAccount(USER_ID, { confirmationPhrase: "WRONG" }, "127.0.0.1")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("requires password re-authentication for credentials accounts", async () => {
    await expect(
      accountService.deleteAccount(
        USER_ID,
        { confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE },
        "127.0.0.1"
      )
    ).rejects.toBeInstanceOf(ReauthenticationRequiredError);

    mocks.verifyPassword.mockResolvedValue(false);
    await expect(
      accountService.deleteAccount(
        USER_ID,
        {
          confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
          password: "wrong",
        },
        "127.0.0.1"
      )
    ).rejects.toBeInstanceOf(ReauthenticationRequiredError);
    mocks.verifyPassword.mockResolvedValue(true);
  });

  it("deletes account after confirmation and password verification", async () => {
    const result = await accountService.deleteAccount(
      USER_ID,
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        password: "correct-password",
      },
      "127.0.0.1"
    );
    expect(result).toEqual({ success: true });
    expect(mocks.verifyPassword).toHaveBeenCalled();
    expect(mocks.deleteById).toHaveBeenCalledWith(USER_ID, expect.anything());
  });

  it("throws when account is missing", async () => {
    mocks.findById.mockResolvedValue(null);
    await expect(
      accountService.deleteAccount(
        USER_ID,
        { confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE },
        "127.0.0.1"
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rate limits repeated deletion attempts", async () => {
    const payload = {
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      password: "correct-password",
    };
    for (let i = 0; i < 3; i++) {
      await accountService.deleteAccount(USER_ID, payload, "127.0.0.1");
    }
    await expect(accountService.deleteAccount(USER_ID, payload, "127.0.0.1")).rejects.toMatchObject({
      name: "RateLimitError",
    });
  });
});
