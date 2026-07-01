import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptNote,
  decryptNote,
  rotateNoteKey,
  TITLE_MAX_LENGTH,
  BODY_MAX_LENGTH,
} from "@/lib/crypto-client/notes";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

describe("note encryption", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);
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
    lockVaultSession();
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

  it("rotates note key and re-encrypts content", async () => {
    const encrypted = await encryptNote(USER_ID, NOTE_ID, {
      title: "Original",
      body: "Original body",
    });
    const rotated = await rotateNoteKey(
      USER_ID,
      NOTE_ID,
      { title: "Rotated", tagIds: [], answered: false, categoryId: null },
      "Rotated body",
      vaultKey
    );
    const decrypted = await decryptNote(
      rotated.encryptedMetadata,
      rotated.encryptedBody,
      rotated.encryptedWrappedNoteKey
    );
    expect(decrypted.metadata.title).toBe("Rotated");
    expect(decrypted.body).toBe("Rotated body");
    expect(rotated.encryptedWrappedNoteKey.ciphertext).not.toBe(
      encrypted.encryptedWrappedNoteKey.ciphertext
    );
  });
});
