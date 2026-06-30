import { describe, it, expect } from "vitest";
import { encryptField, decryptField } from "@/lib/crypto-client/aes-gcm";
import {
  normalizeVaultPassword,
  deriveVaultPasswordKey,
  deriveVaultPasswordKeyFromMetadata,
} from "@/lib/crypto-client/vault-kdf";

const USER_ID = "00000000-0000-4000-8000-000000000001";

describe("vault-kdf", () => {
  it("normalizes vault passwords with NFKC", () => {
    const bytes = normalizeVaultPassword("café");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("derives stable keys from password metadata", async () => {
    const { key, metadata } = await deriveVaultPasswordKey("vault-password");
    const restored = await deriveVaultPasswordKeyFromMetadata("vault-password", metadata);
    const encrypted = await encryptField("probe", key, {
      userId: USER_ID,
      resourceId: USER_ID,
      field: "vault_key",
    });
    const decrypted = await decryptField(encrypted, restored);
    expect(decrypted).toBe("probe");
  });
});
