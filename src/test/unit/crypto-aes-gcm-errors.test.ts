import { describe, it, expect } from "vitest";
import { generateAesKey, encryptField, decryptField } from "@/lib/crypto-client/aes-gcm";
import { USER_ID, LETTER_ID } from "@/test/helpers/fixtures";

describe("aes-gcm error handling", () => {
  it("rejects decryption with the wrong key", async () => {
    const keyA = await generateAesKey();
    const keyB = await generateAesKey();
    const encrypted = await encryptField("secret", keyA, {
      userId: USER_ID,
      resourceId: LETTER_ID,
      field: "title",
    });
    await expect(decryptField(encrypted, keyB)).rejects.toThrow();
  });
});
