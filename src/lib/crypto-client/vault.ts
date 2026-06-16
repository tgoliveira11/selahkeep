import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import {
  generateAesKey,
  exportAesKey,
  importAesKey,
  encryptField,
  decryptField,
} from "./aes-gcm";
import {
  getOrCreateDeviceSecret,
  storeLocalVaultEnvelope,
  getLocalVaultEnvelope,
} from "./device-storage";
import { unlockVaultSession } from "./vault-session";
import type { DeviceVaultUnlockResult } from "./trusted-device-unlock-verification";
import { verifiedOnlineTrustedDeviceVerification } from "./trusted-device-unlock-verification";

export const VAULT_VERSION = "vault-v1";

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

/** Clears in-memory vault key and local trusted-device material for this user. */
export async function clearVaultClientState(userId: string): Promise<void> {
  setSessionVaultKey(null);
  const { resetVaultSessionLockState } = await import("./vault-session");
  resetVaultSessionLockState();
  const { clearLocalVaultData } = await import("./device-storage");
  await clearLocalVaultData(userId);
}

export async function generateUserVaultKey(): Promise<CryptoKey> {
  return generateAesKey();
}

export async function buildDeviceVaultEnvelope(
  vaultKey: CryptoKey,
  userId: string,
  resourceId: string
): Promise<{ encryptedVaultKey: EncryptedPayload; deviceId: string }> {
  const { deviceId, deviceSecret } = await getOrCreateDeviceSecret(userId);
  const encryptedVaultKey = await encryptField(
    bytesToBase64Url(await exportAesKey(vaultKey)),
    deviceSecret,
    { userId, resourceId, field: "vault_key" }
  );
  return { encryptedVaultKey, deviceId };
}

export async function wrapVaultKeyForDevice(
  vaultKey: CryptoKey,
  userId: string,
  resourceId: string
): Promise<{ encryptedVaultKey: EncryptedPayload; deviceId: string }> {
  const { encryptedVaultKey, deviceId } = await buildDeviceVaultEnvelope(
    vaultKey,
    userId,
    resourceId
  );
  await storeLocalVaultEnvelope(userId, deviceId, encryptedVaultKey);
  return { encryptedVaultKey, deviceId };
}

export async function unwrapVaultKeyFromDevice(
  userId: string,
  encryptedVaultKey?: EncryptedPayload,
  options?: { explicit?: boolean }
): Promise<DeviceVaultUnlockResult> {
  const explicit = options?.explicit ?? false;
  const applyVaultKey = (vaultKey: CryptoKey): CryptoKey => {
    if (explicit) {
      unlockVaultSession(vaultKey);
    } else {
      setSessionVaultKey(vaultKey);
    }
    return vaultKey;
  };

  const { unlockVaultFromDeviceEnvelopes } = await import("./vault-unlock");
  if (encryptedVaultKey) {
    const { deviceSecret } = await getOrCreateDeviceSecret(userId);
    const keyBytes = base64UrlToBytes(
      await decryptField(encryptedVaultKey, deviceSecret)
    );
    const vaultKey = await importAesKey(keyBytes);
    applyVaultKey(vaultKey);
    const { recordTrustedDeviceUnlock } = await import("./record-device-unlock");
    void recordTrustedDeviceUnlock(userId);
    return {
      vaultKey,
      verification: verifiedOnlineTrustedDeviceVerification(),
    };
  }
  return unlockVaultFromDeviceEnvelopes(userId, undefined, { explicit });
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
  const { recordTrustedDeviceUnlock } = await import("./record-device-unlock");
  void recordTrustedDeviceUnlock(encryptedVaultKey.aad.userId);
  return vaultKey;
}

export function generateDefaultTitle(): string {
  const now = new Date();
  const formatted = now.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  return `Letter from ${formatted}`;
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
