import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, beforeEach } from "vitest";
import {
  createEmptyVaultIndex,
  addVaultCategory,
  addVaultTag,
  encryptVaultIndex,
  decryptVaultIndex,
} from "@/lib/crypto-client/vault-index";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";
import { SENTINEL_PHRASE } from "@/test/security/sentinel-phrase.test";

describe("category and tag encryption", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);
  });

  it("stores category and tag names only inside encrypted vault index", async () => {
    const base = createEmptyVaultIndex();
    const withCategory = addVaultCategory(base, SENTINEL_PHRASE).index;
    const withTag = addVaultTag(withCategory, "prayer").index;

    const encrypted = await encryptVaultIndex(withTag, USER_ID, vaultKey);
    const blob = JSON.stringify(encrypted);

    expect(blob).not.toContain(SENTINEL_PHRASE);
    expect(blob).not.toContain("prayer");

    const decrypted = await decryptVaultIndex(encrypted, vaultKey);
    expect(decrypted.categories[0]?.name).toBe(SENTINEL_PHRASE);
    expect(decrypted.tags[0]?.name).toBe("prayer");
  });
});
