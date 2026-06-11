import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/index", () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: { kind: string }) => Promise<string>) => fn({ kind: "tx" })),
  },
}));

describe("runInTransaction", () => {
  it("delegates to the database transaction helper", async () => {
    const { runInTransaction } = await import("@/lib/db/transaction");
    await expect(runInTransaction(async () => "ok")).resolves.toBe("ok");
  });
});
