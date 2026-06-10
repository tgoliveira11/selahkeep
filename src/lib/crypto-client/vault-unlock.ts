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
import { vaultApi } from "@/lib/api-client/vault";
import { trustedDevicesApi } from "@/lib/api-client/trusted-devices";

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

export class RevokedTrustedDeviceError extends Error {
  constructor(message = "This trusted device has been revoked.") {
    super(message);
    this.name = "RevokedTrustedDeviceError";
  }
}

/** When online, verifies device is not revoked; clears local material if revoked. */
export async function assertTrustedDeviceCanUnlock(
  userId: string,
  clientDeviceId: string
): Promise<void> {
  try {
    const { state } = await trustedDevicesApi.deviceState(clientDeviceId);
    if (state === "revoked") {
      await clearLocalVaultData(userId);
      setSessionVaultKey(null);
      throw new RevokedTrustedDeviceError();
    }
  } catch (error) {
    if (error instanceof RevokedTrustedDeviceError) throw error;
    // Offline or unauthenticated: local unlock may still work (documented limitation).
  }
}

async function collectEnvelopeCandidates(
  userId: string,
  clientDeviceId: string
): Promise<EncryptedPayload[]> {
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

  await assertTrustedDeviceCanUnlock(userId, clientDeviceId);

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
  } catch {
    // Offline or unauthenticated; rely on local envelope only.
  }

  return candidates;
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
  sampleEncryptedLetterKey?: EncryptedPayload
): Promise<CryptoKey> {
  const { deviceId, deviceSecret } = await getOrCreateDeviceSecret(userId);
  const candidates = await collectEnvelopeCandidates(userId, deviceId);

  if (candidates.length === 0) {
    throw new Error("No vault envelope found for this device");
  }

  if (sampleEncryptedLetterKey && getSessionVaultKey()) {
    if (await canDecryptLetterKey(getSessionVaultKey()!, sampleEncryptedLetterKey)) {
      return getSessionVaultKey()!;
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

      setSessionVaultKey(vaultKey);
      await storeLocalVaultEnvelope(userId, deviceId, envelope);
      const { recordTrustedDeviceUnlock } = await import("./record-device-unlock");
      void recordTrustedDeviceUnlock(userId);
      return vaultKey;
    } catch {
      continue;
    }
  }

  if (!sampleEncryptedLetterKey) {
    for (const envelope of candidates) {
      try {
        const vaultKey = await vaultKeyFromEnvelope(envelope, deviceSecret);
        setSessionVaultKey(vaultKey);
        await storeLocalVaultEnvelope(userId, deviceId, envelope);
        const { recordTrustedDeviceUnlock } = await import("./record-device-unlock");
        void recordTrustedDeviceUnlock(userId);
        return vaultKey;
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
