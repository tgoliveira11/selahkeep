import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptNote,
  decryptNote,
  TITLE_MAX_LENGTH,
  BODY_MAX_LENGTH,
} from "@/lib/crypto-client/notes";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

describe("note encryption", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    setSessionVaultKey(vaultKey);
  });

  it("round-trips metadata and markdown body", async () => {
    const encrypted = await encryptNote(USER_ID, NOTE_ID, {
      title: "Prayer note",
      body: "# Hello\n\n**Bold** reflection.",
      tagIds: ["tag-1"],
      answered: true,
    });
    const decrypted = await decryptNote(
      encrypted.encryptedMetadata,
      encrypted.encryptedBody,
      encrypted.encryptedWrappedNoteKey
    );
    expect(decrypted.metadata.title).toBe("Prayer note");
    expect(decrypted.metadata.answered).toBe(true);
    expect(decrypted.metadata.tagIds).toEqual(["tag-1"]);
    expect(decrypted.body).toContain("**Bold**");
  });

  it("rejects when vault is locked", async () => {
    setSessionVaultKey(null);
    await expect(
      encryptNote(USER_ID, NOTE_ID, { title: "t", body: "b" })
    ).rejects.toThrow("Vault is locked");
  });

  it("enforces title length", async () => {
    await expect(
      encryptNote(USER_ID, NOTE_ID, { title: "x".repeat(TITLE_MAX_LENGTH + 1), body: "body" })
    ).rejects.toThrow("Title too long");
  });

  it("enforces body length", async () => {
    await expect(
      encryptNote(USER_ID, NOTE_ID, { title: "title", body: "x".repeat(BODY_MAX_LENGTH + 1) })
    ).rejects.toThrow("Body too long");
  });
});
