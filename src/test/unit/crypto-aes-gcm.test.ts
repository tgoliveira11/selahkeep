import { describe, it, expect } from "vitest";
import {
  generateAesKey,
  encryptField,
  decryptField,
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
});
