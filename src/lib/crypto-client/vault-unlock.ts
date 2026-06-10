import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";
import { decryptField, importAesKey } from "./aes-gcm";
import {
  getOrCreateDeviceSecret,
  getLocalVaultEnvelope,
  storeLocalVaultEnvelope,
} from "./device-storage";
import { setSessionVaultKey, getSessionVaultKey } from "./vault";
import { vaultApi } from "@/lib/api-client/vault";

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

  // Coerce payloads returned from PostgreSQL jsonb (key order may differ).
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

async function collectEnvelopeCandidates(userId: string): Promise<EncryptedPayload[]> {
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

  const local = await getLocalVaultEnvelope(userId);
  if (local) add(local);

  try {
    const serverEnvelopes = await vaultApi.deviceEnvelopes();
    // Oldest server envelope first — matches the key used when letters were first created.
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
  const candidates = await collectEnvelopeCandidates(userId);

  if (candidates.length === 0) {
    throw new Error("No vault envelope found for this device");
  }

  // Fast path: current session key still works for existing letters.
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

  // No letter sample: return first envelope that decrypts (legacy unlock path).
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
