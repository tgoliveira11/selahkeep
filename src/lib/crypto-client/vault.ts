import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import {
  generateAesKey,
  exportAesKey,
  importAesKey,
  encryptField,
  decryptField,
} from "./aes-gcm";
import { unlockVaultSession } from "./vault-session";
import { purgeTrustedDeviceIdb } from "./vault-idb-cleanup";

export const VAULT_VERSION = "vault-v1";
export const VAULT_VERSION_V2 = "vault-v2";

let sessionVaultKey: CryptoKey | null = null;

export function getSessionVaultKey(): CryptoKey | null {
  return sessionVaultKey;
}

export function setSessionVaultKey(key: CryptoKey | null): void {
  sessionVaultKey = key;
}

export function lockVault(): void {
  sessionVaultKey = null;
}

export function isVaultUnlocked(): boolean {
  return sessionVaultKey !== null;
}

/** Clears in-memory vault key and purges legacy trusted-device IndexedDB stores. */
export async function clearVaultClientState(userId: string): Promise<void> {
  setSessionVaultKey(null);
  const { resetVaultSessionLockState } = await import("./vault-session");
  resetVaultSessionLockState();
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
): Promise<import("@/lib/validation/encrypted-payload").EncryptedPayload> {
  return encryptVaultSettings(settings, userId, vaultKey);
}

export { defaultVaultSettings, encryptVaultSettings, decryptVaultSettings } from "./vault-settings";

export async function createEmptyEncryptedVaultIndex(
  vaultKey: CryptoKey,
  userId: string
): Promise<import("@/lib/validation/encrypted-payload").EncryptedPayload> {
  const index = createEmptyVaultIndex();
  return encryptVaultIndex(index, userId, vaultKey);
}

export async function generateUserVaultKey(): Promise<CryptoKey> {
  return generateAesKey();
}

export async function wrapVaultKeyForRecovery(
  vaultKey: CryptoKey,
  recoveryCode: string,
  userId: string,
  resourceId: string
): Promise<{ encryptedVaultKey: EncryptedPayload; kdfMetadata: KdfMetadata }> {
  const { deriveRecoveryKey } = await import("./recovery-code");
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
  options?: { explicit?: boolean }
): Promise<CryptoKey> {
  const { deriveRecoveryKeyFromMetadata } = await import("./recovery-code");
  const derivedKey = await deriveRecoveryKeyFromMetadata(recoveryCode, kdfMetadata);
  const keyBytes = base64UrlToBytes(
    await decryptField(encryptedVaultKey, derivedKey)
  );
  const vaultKey = await importAesKey(keyBytes);
  if (options?.explicit ?? true) {
    unlockVaultSession(vaultKey);
  } else {
    setSessionVaultKey(vaultKey);
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

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
