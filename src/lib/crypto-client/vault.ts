import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import {
  generateUserVaultKey,
  getSessionVaultKey,
  setSessionVaultKey,
  lockVault,
  isVaultUnlocked,
  hasUnlockedVaultSession,
} from "@/modules/vault/core/vault-key";
import { purgeTrustedDeviceIdb } from "./vault-idb-cleanup";

export {
  generateUserVaultKey,
  getSessionVaultKey,
  setSessionVaultKey,
  lockVault,
  isVaultUnlocked,
  hasUnlockedVaultSession,
} from "@/modules/vault/core/vault-key";

export { VAULT_VERSION, VAULT_VERSION_V2 } from "@/modules/vault/core/constants";

/** Clears in-memory vault key and purges legacy trusted-device IndexedDB stores. */
export async function clearVaultClientState(userId: string): Promise<void> {
  const { lockVaultSession } = await import("@/lib/crypto-client/vault-session");
  lockVaultSession("logout");
  await purgeTrustedDeviceIdb();
  void userId;
}

import type { VaultIndexPlaintext } from "./vault-index-types";
import { createEmptyVaultIndex, encryptVaultIndex } from "./vault-index";
import {
  defaultVaultSettings,
  encryptVaultSettings,
  type VaultSettingsPlaintext,
  type VaultUnlockBehavior,
} from "./vault-settings";

export type { VaultIndexPlaintext, VaultIndexEntry, VaultIndexNoteEntry } from "./vault-index-types";
export type { VaultSettingsPlaintext, VaultUnlockBehavior } from "./vault-settings";

/** Encrypt vault settings under the User Vault Key (client-only plaintext). */
export async function createEncryptedVaultSettings(
  vaultKey: CryptoKey,
  userId: string,
  settings: VaultSettingsPlaintext
): Promise<EncryptedPayload> {
  return encryptVaultSettings(settings, userId, vaultKey);
}

export { defaultVaultSettings, encryptVaultSettings, decryptVaultSettings } from "./vault-settings";

export async function createEmptyEncryptedVaultIndex(
  vaultKey: CryptoKey,
  userId: string
): Promise<EncryptedPayload> {
  const index = createEmptyVaultIndex();
  return encryptVaultIndex(index, userId, vaultKey);
}

export async function wrapVaultKeyForRecovery(
  vaultKey: CryptoKey,
  recoveryCode: string,
  userId: string,
  resourceId: string
): Promise<{ encryptedVaultKey: EncryptedPayload; kdfMetadata: KdfMetadata }> {
  const { deriveRecoveryKey } = await import("./recovery-code");
  const { encryptField } = await import("./aes-gcm");
  const { exportAesKey } = await import("./aes-gcm");
  const { bytesToBase64Url } = await import("./encoding");
  const { key: derivedKey, metadata } = await deriveRecoveryKey(recoveryCode);
  const encryptedVaultKey = await encryptField(
    bytesToBase64Url(await exportAesKey(vaultKey)),
    derivedKey,
    { userId, resourceId, field: "vault_key" }
  );
  return { encryptedVaultKey, kdfMetadata: metadata };
}

export async function unwrapVaultKeyFromRecovery(
  recoveryCode: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata,
  options?: { applySession?: boolean }
): Promise<CryptoKey> {
  const { deriveRecoveryKeyFromMetadata } = await import("./recovery-code");
  const { decryptField, importAesKey } = await import("./aes-gcm");
  const { base64UrlToBytes } = await import("./encoding");
  const { setUnlockedVaultSession } = await import("@/lib/crypto-client/vault-session");
  const derivedKey = await deriveRecoveryKeyFromMetadata(recoveryCode, kdfMetadata);
  const keyBytes = base64UrlToBytes(await decryptField(encryptedVaultKey, derivedKey));
  const vaultKey = await importAesKey(keyBytes);
  if (options?.applySession ?? true) {
    await setUnlockedVaultSession({ userVaultKey: vaultKey, method: "recovery_phrase" });
  }
  return vaultKey;
}

export function generateDefaultNoteTitle(): string {
  const now = new Date();
  const formatted = now.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  return `Note from ${formatted}`;
}
