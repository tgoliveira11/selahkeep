import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, beforeEach } from "vitest";
import { wrapNoteKey, unwrapNoteKey, generateNoteKey } from "@/lib/crypto-client/note-key";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

describe("note key wrap/unwrap", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);
  });

  it("round-trips note key under UVK", async () => {
    const noteKey = await generateNoteKey();
    const wrapped = await wrapNoteKey(USER_ID, NOTE_ID, noteKey, vaultKey);
    const unwrapped = await unwrapNoteKey(wrapped, vaultKey);
    const [a, b] = await Promise.all([
      crypto.subtle.exportKey("raw", noteKey),
      crypto.subtle.exportKey("raw", unwrapped),
    ]);
    expect(new Uint8Array(a)).toEqual(new Uint8Array(b));
  });

  it("rejects when vault is locked", async () => {
    lockVaultSession();
    const noteKey = await generateNoteKey();
    await expect(wrapNoteKey(USER_ID, NOTE_ID, noteKey)).rejects.toThrow("Vault is locked");
  });
});
