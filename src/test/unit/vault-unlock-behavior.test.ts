import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, beforeEach } from "vitest";
import {
  defaultVaultSettings,
  encryptVaultSettings,
  decryptVaultSettings,
  normalizeVaultSettings,
} from "@/lib/crypto-client/vault-settings";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";

describe("vault unlock behavior settings", () => {
  let vaultKey: CryptoKey;

  beforeEach(async () => {
    vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);
  });

  it("defaults to metadata_only", () => {
    expect(defaultVaultSettings().unlockBehavior).toBe("metadata_only");
  });

  it("round-trips decrypt_all in encrypted vault settings", async () => {
    const settings = { ...defaultVaultSettings(), unlockBehavior: "decrypt_all" as const };
    const encrypted = await encryptVaultSettings(settings, USER_ID, vaultKey);
    const decrypted = await decryptVaultSettings(encrypted, vaultKey);
    expect(decrypted.unlockBehavior).toBe("decrypt_all");
  });

  it("normalizes legacy settings without unlockBehavior", () => {
    const normalized = normalizeVaultSettings({
      setupVersion: 1,
      recoveryPhraseLength: 24,
    });
    expect(normalized.unlockBehavior).toBe("metadata_only");
  });
});
