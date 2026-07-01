import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptNote,
  decryptNote,
  reencryptNoteWithUpdatedMetadata,
} from "@/lib/crypto-client/notes";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

describe("duplicate note encryption", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);
  });

  it("creates independent encryption payloads for duplicate", async () => {
    const originalId = NOTE_ID;
    const duplicateId = crypto.randomUUID();

    const original = await encryptNote(USER_ID, originalId, {
      title: "Original prayer",
      body: "Same body",
      tagIds: ["t1"],
      answered: true,
      pinned: true,
    });

    const duplicate = await encryptNote(USER_ID, duplicateId, {
      title: "Copy of Original prayer",
      body: "Same body",
      tagIds: ["t1"],
      answered: false,
      pinned: false,
      favorite: false,
      archived: false,
      trashed: false,
    });

    expect(original.encryptedBody.ciphertext).not.toBe(duplicate.encryptedBody.ciphertext);
    expect(original.encryptedWrappedNoteKey.ciphertext).not.toBe(
      duplicate.encryptedWrappedNoteKey.ciphertext
    );

    const decryptedDup = await decryptNote(
      duplicate.encryptedMetadata,
      duplicate.encryptedBody,
      duplicate.encryptedWrappedNoteKey
    );
    expect(decryptedDup.metadata.title).toBe("Copy of Original prayer");
    expect(decryptedDup.metadata.answered).toBe(false);
    expect(decryptedDup.metadata.pinned).toBe(false);
    expect(decryptedDup.body).toBe("Same body");
  });

  it("reencrypts lifecycle metadata without rotating note key", async () => {
    const encrypted = await encryptNote(USER_ID, NOTE_ID, {
      title: "Note",
      body: "Body",
    });

    const updated = await reencryptNoteWithUpdatedMetadata(
      USER_ID,
      NOTE_ID,
      {
        title: "Note",
        categoryId: null,
        tagIds: [],
        answered: false,
        pinned: true,
        favorite: true,
        archived: false,
        trashed: false,
        trashedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      "Body",
      encrypted.encryptedWrappedNoteKey
    );

    expect(updated.encryptedWrappedNoteKey).toEqual(encrypted.encryptedWrappedNoteKey);

    const decrypted = await decryptNote(
      updated.encryptedMetadata,
      updated.encryptedBody,
      updated.encryptedWrappedNoteKey
    );
    expect(decrypted.metadata.pinned).toBe(true);
    expect(decrypted.metadata.favorite).toBe(true);
  });
});
