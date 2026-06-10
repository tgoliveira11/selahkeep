import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyRepository } from "@/server/repositories/passkey-repository";

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

describe("WebAuthn challenge hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    dbMocks.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "challenge-1" }]),
      }),
    });
  });

  it("rejects expired challenges", async () => {
    chain([
      {
        id: "c1",
        userId: "user-1",
        challenge: "abc",
        type: "registration",
        expiresAt: new Date(Date.now() - 1000),
      },
    ]);
    const result = await passkeyRepository.findValidChallenge("abc", "registration", "user-1");
    expect(result).toBeNull();
  });

  it("rejects challenge belonging to another user", async () => {
    chain([
      {
        id: "c1",
        userId: "user-2",
        challenge: "abc",
        type: "registration",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    const result = await passkeyRepository.findValidChallenge("abc", "registration", "user-1");
    expect(result).toBeNull();
  });

  it("accepts valid scoped challenge", async () => {
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
