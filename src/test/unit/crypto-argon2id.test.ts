import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_ARGON2ID_PARAMS,
  deriveArgon2idAesKey,
  deriveArgon2idAesKeyFromMetadata,
  parseArgon2idMetadata,
  serializeArgon2idMetadata,
} from "@/lib/crypto-client/argon2id";
import { stringToBytes } from "@/lib/crypto-client/encoding";
import { encryptField, decryptField } from "@/lib/crypto-client/aes-gcm";

const userId = "00000000-0000-4000-8000-000000000001";

async function encryptWithDerivedKey(key: CryptoKey, plaintext: string) {
  return encryptField(plaintext, key, {
    userId,
    resourceId: userId,
    field: "vault_key",
  });
}

describe("Argon2id KDF", () => {
  const password = stringToBytes("test-vault-password");
  const salt = new Uint8Array(16).fill(7);

  it("derives stable key with same password/salt/params", async () => {
    const key1 = await deriveArgon2idAesKey(password, salt);
    const metadata = serializeArgon2idMetadata(salt);
    const key2 = await deriveArgon2idAesKeyFromMetadata(password, metadata);
    const encrypted = await encryptWithDerivedKey(key1, "probe");
    const decrypted = await decryptField(encrypted, key2);
    expect(decrypted).toBe("probe");
  });

  it("different salt produces different key", async () => {
    const key1 = await deriveArgon2idAesKey(password, salt);
    const key2 = await deriveArgon2idAesKey(password, new Uint8Array(16).fill(3));
    const c1 = await encryptWithDerivedKey(key1, "probe");
    const c2 = await encryptWithDerivedKey(key2, "probe");
    expect(c1.ciphertext).not.toBe(c2.ciphertext);
  });

  it("different password produces different key", async () => {
    const key1 = await deriveArgon2idAesKey(password, salt);
    const key2 = await deriveArgon2idAesKey(stringToBytes("other-password"), salt);
    const c1 = await encryptWithDerivedKey(key1, "probe");
    const c2 = await encryptWithDerivedKey(key2, "probe");
    expect(c1.ciphertext).not.toBe(c2.ciphertext);
  });

  it("serializes and restores parameters", () => {
    const metadata = serializeArgon2idMetadata(salt);
    const parsed = parseArgon2idMetadata(metadata);
    expect(parsed.memory).toBe(DEFAULT_ARGON2ID_PARAMS.memory);
    expect(parsed.iterations).toBe(DEFAULT_ARGON2ID_PARAMS.iterations);
    expect(parsed.parallelism).toBe(DEFAULT_ARGON2ID_PARAMS.parallelism);
    expect(parsed.salt).toEqual(salt);
  });

  it("does not use PBKDF2 in vault-kdf module", () => {
    const file = readFileSync(
      path.resolve(__dirname, "../../lib/crypto-client/vault-kdf.ts"),
      "utf8"
    );
    expect(file).not.toContain("PBKDF2");
    expect(file).not.toContain("pbkdf2");
  });
});
