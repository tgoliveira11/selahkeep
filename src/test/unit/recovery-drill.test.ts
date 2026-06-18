import { describe, it, expect } from "vitest";
import { generateRecoveryPhrase } from "@/lib/crypto-client/recovery-phrase";
import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { wrapVaultKeyForRecoveryPhrase } from "@/lib/crypto-client/vault-envelope";
import { verifyRecoveryPhraseDrill } from "@/lib/crypto-client/recovery-drill";
import { unlockVaultSession, lockVaultSession } from "@/lib/crypto-client/vault-session";
import { exportAesKey } from "@/lib/crypto-client/aes-gcm";

const userId = "00000000-0000-4000-8000-000000000001";

describe("verifyRecoveryPhraseDrill", () => {
  it("verifies phrase against envelope when vault is locked without unlocking session", async () => {
    const vaultKey = await generateUserVaultKey();
    const phrase = generateRecoveryPhrase(12);
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecoveryPhrase(
      vaultKey,
      phrase,
      { userId, resourceId: userId }
    );

    lockVaultSession();

    const result = await verifyRecoveryPhraseDrill(phrase, encryptedVaultKey, kdfMetadata, {
      vaultCurrentlyUnlocked: false,
    });

    expect(result.status).toBe("verified");
  });

  it("compares derived key to session key when vault is unlocked", async () => {
    const vaultKey = await generateUserVaultKey();
    const phrase = generateRecoveryPhrase(12);
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecoveryPhrase(
      vaultKey,
      phrase,
      { userId, resourceId: userId }
    );

    unlockVaultSession(vaultKey);

    const match = await verifyRecoveryPhraseDrill(phrase, encryptedVaultKey, kdfMetadata, {
      vaultCurrentlyUnlocked: true,
    });
    expect(match.status).toBe("verified");

    const otherKey = await generateUserVaultKey();
    unlockVaultSession(otherKey);
    const mismatch = await verifyRecoveryPhraseDrill(
      phrase,
      encryptedVaultKey,
      kdfMetadata,
      { vaultCurrentlyUnlocked: true }
    );
    expect(mismatch.status).toBe("mismatch");
  });

  it("returns invalid_phrase for wrong words without mutating envelope", async () => {
    const vaultKey = await generateUserVaultKey();
    const phrase = generateRecoveryPhrase(12);
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecoveryPhrase(
      vaultKey,
      phrase,
      { userId, resourceId: userId }
    );

    const before = await exportAesKey(vaultKey);
    const result = await verifyRecoveryPhraseDrill(
      generateRecoveryPhrase(12),
      encryptedVaultKey,
      kdfMetadata
    );
    const after = await exportAesKey(vaultKey);

    expect(result.status).toBe("invalid_phrase");
    expect(before).toEqual(after);
  });
});
