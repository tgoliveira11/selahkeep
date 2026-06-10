import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptLetter,
  decryptLetter,
  TITLE_MAX_LENGTH,
  BODY_MAX_LENGTH,
} from "@/lib/crypto-client/letters";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID, LETTER_ID } from "@/test/helpers/fixtures";

describe("letter encryption", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    setSessionVaultKey(vaultKey);
  });

  it("round-trips title and body", async () => {
    const encrypted = await encryptLetter(
      USER_ID,
      LETTER_ID,
      "My private title",
      "Dear God, this is a test."
    );
    const decrypted = await decryptLetter(
      encrypted.encryptedTitle,
      encrypted.encryptedBody,
      encrypted.encryptedLetterKey
    );
    expect(decrypted).toEqual({
      title: "My private title",
      body: "Dear God, this is a test.",
    });
  });

  it("rejects when vault is locked", async () => {
    setSessionVaultKey(null);
    await expect(encryptLetter(USER_ID, LETTER_ID, "t", "b")).rejects.toThrow("Vault is locked");
  });

  it("enforces title length", async () => {
    await expect(
      encryptLetter(USER_ID, LETTER_ID, "x".repeat(TITLE_MAX_LENGTH + 1), "body")
    ).rejects.toThrow("Title too long");
  });

  it("enforces body length", async () => {
    await expect(
      encryptLetter(USER_ID, LETTER_ID, "title", "x".repeat(BODY_MAX_LENGTH + 1))
    ).rejects.toThrow("Body too long");
  });
});
