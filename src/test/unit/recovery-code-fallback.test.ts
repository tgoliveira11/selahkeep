import { describe, it, expect, vi } from "vitest";
import { deriveRecoveryKey, deriveRecoveryKeyFromMetadata } from "@/lib/crypto-client/recovery-code";

vi.mock("hash-wasm", () => ({
  argon2id: vi.fn(async () => {
    throw new Error("argon2 unavailable");
  }),
}));

describe("recovery code pbkdf2 fallback", () => {
  it("uses pbkdf2 metadata when argon2 fails", async () => {
    const { key, metadata } = await deriveRecoveryKey("river-candle-forest-window-silver-anchor-harbor-fabric-lantern-cloud");
    expect(metadata.kdf).toBe("pbkdf2-sha256");
    const restored = await deriveRecoveryKeyFromMetadata(
      "river-candle-forest-window-silver-anchor-harbor-fabric-lantern-cloud",
      metadata
    );
    const payload = new TextEncoder().encode("check");
    const iv = new Uint8Array(12);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, restored, encrypted);
    expect(new Uint8Array(decrypted)).toEqual(payload);
  });
});
