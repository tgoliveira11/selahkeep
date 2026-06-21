import { describe, it, expect, beforeEach } from "vitest";
import { encryptNote } from "@/lib/crypto-client/notes";
import {
  encryptNoteVersion,
  decryptNoteVersion,
  decryptNoteVersionMetadata,
} from "@/lib/crypto-client/note-versions";
import { normalizeNoteMetadata } from "@/lib/notes/note-metadata";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID, NOTE_ID, VERSION_ID } from "@/test/helpers/fixtures";

describe("note version encryption", () => {
  beforeEach(async () => {
    setSessionVaultKey(await generateUserVaultKey());
  });

  async function makeNote() {
    return encryptNote(USER_ID, NOTE_ID, {
      title: "Original",
      body: "first body",
      tagIds: ["t1"],
      answered: false,
    });
  }

  it("round-trips a version under the note's existing key", async () => {
    const note = await makeNote();
    const metadata = normalizeNoteMetadata({
      title: "Snapshot",
      tagIds: ["t1"],
      answered: true,
    });

    const version = await encryptNoteVersion(
      USER_ID,
      NOTE_ID,
      VERSION_ID,
      metadata,
      "snapshot body\nline two",
      note.encryptedWrappedNoteKey
    );

    expect(version.id).toBe(VERSION_ID);
    expect(version.encryptedMetadata.aad.resourceId).toBe(VERSION_ID);
    expect(version.encryptedMetadata.aad.field).toBe("note_version_metadata");
    expect(version.encryptedBody.aad.field).toBe("note_version_body");
    expect(version.encryptedWrappedNoteKey).toEqual(note.encryptedWrappedNoteKey);

    const decrypted = await decryptNoteVersion(
      version.encryptedMetadata,
      version.encryptedBody,
      version.encryptedWrappedNoteKey
    );
    expect(decrypted.metadata.title).toBe("Snapshot");
    expect(decrypted.metadata.answered).toBe(true);
    expect(decrypted.body).toBe("snapshot body\nline two");
  });

  it("decrypts only metadata for the history list", async () => {
    const note = await makeNote();
    const version = await encryptNoteVersion(
      USER_ID,
      NOTE_ID,
      VERSION_ID,
      normalizeNoteMetadata({ title: "Title only" }),
      "body",
      note.encryptedWrappedNoteKey
    );
    const meta = await decryptNoteVersionMetadata(
      version.encryptedMetadata,
      version.encryptedWrappedNoteKey
    );
    expect(meta.title).toBe("Title only");
  });

  it("rejects metadata bound to a different version id (AAD swap)", async () => {
    const note = await makeNote();
    const version = await encryptNoteVersion(
      USER_ID,
      NOTE_ID,
      VERSION_ID,
      normalizeNoteMetadata({ title: "t" }),
      "b",
      note.encryptedWrappedNoteKey
    );
    const tampered = {
      ...version.encryptedMetadata,
      aad: { ...version.encryptedMetadata.aad, resourceId: NOTE_ID },
    };
    await expect(
      decryptNoteVersion(tampered, version.encryptedBody, version.encryptedWrappedNoteKey)
    ).rejects.toThrow();
  });

  it("fails closed when the vault is locked", async () => {
    const note = await makeNote();
    setSessionVaultKey(null);
    await expect(
      encryptNoteVersion(
        USER_ID,
        NOTE_ID,
        VERSION_ID,
        normalizeNoteMetadata({ title: "t" }),
        "b",
        note.encryptedWrappedNoteKey
      )
    ).rejects.toThrow("Vault is locked");
  });
});
