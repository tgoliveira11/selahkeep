import { describe, it, expect, vi } from "vitest";
import { deriveRecoveryKey } from "@/lib/crypto-client/recovery-code";

vi.mock("hash-wasm", () => ({
  argon2id: vi.fn(async () => {
    throw new Error("argon2 unavailable");
  }),
}));

describe("recovery code key derivation", () => {
  it("fails closed when Argon2id is unavailable (no PBKDF2 fallback)", async () => {
    await expect(
      deriveRecoveryKey("river-candle-forest-window-silver-anchor-harbor-fabric-lantern-cloud")
    ).rejects.toThrow(/Recovery code key derivation failed/);
  });
});
