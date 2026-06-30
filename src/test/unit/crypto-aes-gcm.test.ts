import { describe, it, expect } from "vitest";
import {
  generateAesKey,
  encryptField,
  decryptField,
  encryptBytes,
  decryptBytes,
  encryptedPayloadCiphertextBytes,
  exportAesKey,
  importAesKey,
} from "@/lib/crypto-client/aes-gcm";
import { USER_ID, LETTER_ID } from "@/test/helpers/fixtures";

describe("aes-gcm helpers", () => {
  it("round-trips encrypted fields", async () => {
    const key = await generateAesKey();
    const encrypted = await encryptField("secret text", key, {
      userId: USER_ID,
      resourceId: LETTER_ID,
      field: "body",
    });
    await expect(decryptField(encrypted, key)).resolves.toBe("secret text");
  });

  it("imports and exports raw keys", async () => {
    const key = await generateAesKey();
    const raw = await exportAesKey(key);
    const imported = await importAesKey(raw);
    const encrypted = await encryptField("x", imported, {
      userId: USER_ID,
      resourceId: LETTER_ID,
      field: "title",
    });
    await expect(decryptField(encrypted, key)).resolves.toBe("x");
  });

  it("round-trips binary payloads with encryptBytes/decryptBytes", async () => {
    const key = await generateAesKey();
    const plaintext = new Uint8Array([0, 1, 2, 255, 128]);
    const encrypted = await encryptBytes(plaintext, key, {
      userId: USER_ID,
      resourceId: LETTER_ID,
      field: "note_attachment_blob",
    });
    const decrypted = await decryptBytes(encrypted, key);
    expect(Array.from(decrypted)).toEqual(Array.from(plaintext));
    expect(encryptedPayloadCiphertextBytes(encrypted)).toBeGreaterThan(0);
  });
});
