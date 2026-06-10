import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";
import { decryptField, importAesKey } from "./aes-gcm";
import {
  getOrCreateDeviceSecret,
  getLocalVaultEnvelope,
  storeLocalVaultEnvelope,
  clearLocalVaultData,
} from "./device-storage";
import { setSessionVaultKey, getSessionVaultKey } from "./vault";
import { isVaultManuallyLocked, lockVaultSession, unlockVaultSession } from "./vault-session";
import { vaultApi } from "@/lib/api-client/vault";
import { trustedDevicesApi } from "@/lib/api-client/trusted-devices";
import { ApiError } from "@/lib/api-client/api-error";
import {
  RevokedTrustedDeviceError,
  UnknownTrustedDeviceError,
  classifyTrustedDeviceApiError,
  isNetworkUnavailableError,
} from "./trusted-device-unlock-errors";
import {
  type DeviceVaultUnlockResult,
  type TrustedDeviceUnlockVerification,
  offlineTrustedDeviceVerification,
  verifiedOnlineTrustedDeviceVerification,
} from "./trusted-device-unlock-verification";

export {
  RevokedTrustedDeviceError,
  UnauthenticatedTrustedDeviceError,
  ForbiddenTrustedDeviceError,
  UnknownTrustedDeviceError,
  TrustedDeviceServerError,
  TrustedDeviceNetworkUnavailableError,
  TrustedDeviceUnexpectedError,
  getTrustedDeviceUnlockErrorMessage,
  isTrustedDeviceUnlockError,
} from "./trusted-device-unlock-errors";

export {
  TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE,
  type TrustedDeviceUnlockVerification,
  type DeviceVaultUnlockResult,
  getTrustedDeviceOfflineNotice,
  offlineTrustedDeviceVerification,
  verifiedOnlineTrustedDeviceVerification,
} from "./trusted-device-unlock-verification";

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

function normalizePayload(raw: unknown): EncryptedPayload | null {
  const parsed = encryptedPayloadSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const aadRaw = record.aad;
  if (!aadRaw || typeof aadRaw !== "object") return null;
  const aad = aadRaw as Record<string, unknown>;

  const coerced = {
    version: record.version,
    alg: record.alg,
    iv: record.iv,
    ciphertext: record.ciphertext,
    aad: {
      userId: aad.userId,
      resourceId: aad.resourceId,
      field: aad.field,
    },
  };

  const retry = encryptedPayloadSchema.safeParse(coerced);
  return retry.success ? retry.data : null;
}

function envelopeKey(envelope: EncryptedPayload): string {
  return `${envelope.iv}:${envelope.ciphertext}`;
}

function storeUnlockedVaultKey(vaultKey: CryptoKey, explicit: boolean): void {
  if (explicit) {
    unlockVaultSession(vaultKey);
  } else {
    setSessionVaultKey(vaultKey);
  }
}

async function handleRevokedTrustedDevice(userId: string): Promise<never> {
  await clearLocalVaultData(userId);
  lockVaultSession();
  throw new RevokedTrustedDeviceError();
}

async function handleUnknownTrustedDevice(userId: string): Promise<never> {
  await clearLocalVaultData(userId);
  throw new UnknownTrustedDeviceError();
}

/**
 * When online, verifies trusted-device status with the server.
 * Fail closed by default; allow local unlock only on real network/offline failures.
 */
export async function assertTrustedDeviceCanUnlock(
  userId: string,
  clientDeviceId: string
): Promise<TrustedDeviceUnlockVerification> {
  try {
    const { state } = await trustedDevicesApi.deviceState(clientDeviceId);
    if (state === "revoked") {
      await handleRevokedTrustedDevice(userId);
    }
    if (state === "not_registered") {
      await handleUnknownTrustedDevice(userId);
    }
    return verifiedOnlineTrustedDeviceVerification();
  } catch (error) {
    if (error instanceof RevokedTrustedDeviceError) throw error;
    if (error instanceof UnknownTrustedDeviceError) throw error;
    if (isNetworkUnavailableError(error)) {
      return offlineTrustedDeviceVerification();
    }
    if (error instanceof ApiError && error.status === 404) {
      await handleUnknownTrustedDevice(userId);
    }
    classifyTrustedDeviceApiError(error);
  }
}

async function collectEnvelopeCandidates(
  userId: string,
  clientDeviceId: string
): Promise<{ candidates: EncryptedPayload[]; verification: TrustedDeviceUnlockVerification }> {
  const seen = new Set<string>();
  const candidates: EncryptedPayload[] = [];

  function add(raw: unknown) {
    const payload = normalizePayload(raw);
    if (!payload) return;
    const key = envelopeKey(payload);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(payload);
  }

  const verification = await assertTrustedDeviceCanUnlock(userId, clientDeviceId);

  const local = await getLocalVaultEnvelope(userId);
  if (local) add(local);

  try {
    const serverEnvelopes = await vaultApi.deviceEnvelopes();
    const sorted = [...serverEnvelopes].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const row of sorted) {
      add(row.encryptedVaultKey);
    }
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      return { candidates, verification };
    }
    classifyTrustedDeviceApiError(error);
  }

  return { candidates, verification };
}

async function vaultKeyFromEnvelope(
  envelope: EncryptedPayload,
  deviceSecret: CryptoKey
): Promise<CryptoKey> {
  const keyBytes = base64UrlToBytes(await decryptField(envelope, deviceSecret));
  return importAesKey(keyBytes);
}

async function canDecryptLetterKey(
  vaultKey: CryptoKey,
  encryptedLetterKey: EncryptedPayload
): Promise<boolean> {
  try {
    await decryptField(encryptedLetterKey, vaultKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Unlocks the vault using local and server trusted-device envelopes.
 * When a sample letter key is provided, picks the vault key that decrypts it
 * (handles corrupted local envelopes from failed re-init attempts).
 */
export async function unlockVaultFromDeviceEnvelopes(
  userId: string,
  sampleEncryptedLetterKey?: EncryptedPayload,
  options?: { explicit?: boolean }
): Promise<DeviceVaultUnlockResult> {
  const explicit = options?.explicit ?? false;
  if (isVaultManuallyLocked() && !explicit) {
    throw new Error("Vault is locked");
  }

  const { deviceId, deviceSecret } = await getOrCreateDeviceSecret(userId);
  const { candidates, verification } = await collectEnvelopeCandidates(userId, deviceId);

  if (candidates.length === 0) {
    throw new Error("No vault envelope found for this device");
  }

  if (sampleEncryptedLetterKey && getSessionVaultKey()) {
    if (await canDecryptLetterKey(getSessionVaultKey()!, sampleEncryptedLetterKey)) {
      return {
        vaultKey: getSessionVaultKey()!,
        verification,
      };
    }
    setSessionVaultKey(null);
  }

  for (const envelope of candidates) {
    try {
      const vaultKey = await vaultKeyFromEnvelope(envelope, deviceSecret);

      if (sampleEncryptedLetterKey) {
        if (!(await canDecryptLetterKey(vaultKey, sampleEncryptedLetterKey))) {
          continue;
        }
      }

      storeUnlockedVaultKey(vaultKey, explicit);
      await storeLocalVaultEnvelope(userId, deviceId, envelope);
      const { recordTrustedDeviceUnlock } = await import("./record-device-unlock");
      void recordTrustedDeviceUnlock(userId);
      return { vaultKey, verification };
    } catch {
      continue;
    }
  }

  if (!sampleEncryptedLetterKey) {
    for (const envelope of candidates) {
      try {
        const vaultKey = await vaultKeyFromEnvelope(envelope, deviceSecret);
        storeUnlockedVaultKey(vaultKey, explicit);
        await storeLocalVaultEnvelope(userId, deviceId, envelope);
        const { recordTrustedDeviceUnlock } = await import("./record-device-unlock");
        void recordTrustedDeviceUnlock(userId);
        return { vaultKey, verification };
      } catch {
        continue;
      }
    }
  }

  const hadServerEnvelopes = candidates.length > 1;
  if (!hadServerEnvelopes) {
    throw new Error(
      "No vault data found for this browser. If you changed ports (e.g. 3000 vs 3001), use the same URL as before, or unlock with your recovery code at /vault/unlock."
    );
  }

  throw new Error(
    "Could not unlock vault on this device. Use your recovery code at /vault/unlock, or sign in on the same browser URL you used when you created your letters."
  );
}
