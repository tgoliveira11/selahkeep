import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyRepository, ChallengeValidationError } from "@/server/repositories/passkey-repository";

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: dbMocks.select,
    insert: dbMocks.insert,
    delete: dbMocks.delete,
  },
}));

function chain(result: unknown) {
  const terminal = { limit: vi.fn().mockResolvedValue(result) };
  const where = { limit: terminal.limit, where: vi.fn().mockReturnValue(terminal) };
  const from = { where: where.where, from: vi.fn().mockReturnValue(where) };
  dbMocks.select.mockReturnValue(from);
  return { from, where, terminal };
}

describe("WebAuthn challenge consumption", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: dbMocks.returning,
      }),
    });
    dbMocks.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "challenge-1" }]),
      }),
    });
  });

  it("rejects expired challenges via consumeValidChallenge", async () => {
    dbMocks.returning.mockResolvedValue([]);
    await expect(
      passkeyRepository.consumeValidChallenge("abc", "registration", "user-1")
    ).rejects.toBeInstanceOf(ChallengeValidationError);
  });

  it("consumes a valid challenge once", async () => {
    const row = {
      id: "c1",
      userId: "user-1",
      challenge: "abc",
      type: "registration",
      expiresAt: new Date(Date.now() + 60_000),
    };
    dbMocks.returning.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);

    const first = await passkeyRepository.consumeValidChallenge("abc", "registration", "user-1");
    expect(first).toEqual(row);

    await expect(
      passkeyRepository.consumeValidChallenge("abc", "registration", "user-1")
    ).rejects.toBeInstanceOf(ChallengeValidationError);
  });

  it("rejects challenge belonging to another user", async () => {
    dbMocks.returning.mockResolvedValue([]);
    await expect(
      passkeyRepository.consumeValidChallenge("abc", "registration", "user-1")
    ).rejects.toBeInstanceOf(ChallengeValidationError);
  });

  it("rejects challenge with wrong type", async () => {
    dbMocks.returning.mockResolvedValue([]);
    await expect(
      passkeyRepository.consumeValidChallenge("abc", "authentication", "user-1")
    ).rejects.toBeInstanceOf(ChallengeValidationError);
  });

  it("accepts valid scoped challenge via findValidChallenge (legacy read path)", async () => {
    const row = {
      id: "c1",
      userId: "user-1",
      challenge: "abc",
      type: "registration",
      expiresAt: new Date(Date.now() + 60_000),
    };
    chain([row]);
    const result = await passkeyRepository.findValidChallenge("abc", "registration", "user-1");
    expect(result).toEqual(row);
  });
});
