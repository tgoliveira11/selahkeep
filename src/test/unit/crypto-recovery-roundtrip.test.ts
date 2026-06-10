import { describe, it, expect } from "vitest";
import {
  deriveRecoveryKey,
  deriveRecoveryKeyFromMetadata,
  generateRecoveryCode,
} from "@/lib/crypto-client/recovery-code";

describe("recovery key derivation", () => {
  it("derives stable keys from metadata", async () => {
    const code = generateRecoveryCode();
    const first = await deriveRecoveryKey(code);
    const second = await deriveRecoveryKeyFromMetadata(code, first.metadata);
    const payload = new TextEncoder().encode("vault-check");
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(12) },
      first.key,
      payload
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(12) },
      second,
      encrypted
    );
    expect(new Uint8Array(decrypted)).toEqual(payload);
  });
});
