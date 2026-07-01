import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, beforeEach } from "vitest";
import { encryptNote } from "@/lib/crypto-client/notes";
import { encryptNoteVersion } from "@/lib/crypto-client/note-versions";
import { normalizeNoteMetadata } from "@/lib/notes/note-metadata";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { SENTINEL_PHRASE } from "./sentinel-phrase.test";
import { USER_ID, NOTE_ID, VERSION_ID } from "@/test/helpers/fixtures";

describe("sentinel phrase note versions", () => {
  beforeEach(async () => {
    await unlockVaultSession(await generateUserVaultKey());
  });

  it("never exposes sentinel plaintext in an encrypted version payload", async () => {
    const note = await encryptNote(USER_ID, NOTE_ID, {
      title: SENTINEL_PHRASE,
      body: SENTINEL_PHRASE,
    });

    const version = await encryptNoteVersion(
      USER_ID,
      NOTE_ID,
      VERSION_ID,
      normalizeNoteMetadata({ title: SENTINEL_PHRASE }),
      SENTINEL_PHRASE,
      note.encryptedWrappedNoteKey
    );

    const serialized = JSON.stringify(version);
    expect(serialized).not.toContain(SENTINEL_PHRASE);
    // AAD only carries non-sensitive identifiers.
    expect(JSON.stringify(version.encryptedMetadata.aad)).not.toContain(SENTINEL_PHRASE);
  });
});
