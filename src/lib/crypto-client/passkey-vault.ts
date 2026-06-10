import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { AuthenticationExtensionsClientOutputs } from "@simplewebauthn/browser";
import {
  encryptField,
  decryptField,
  exportAesKey,
  importAesKey,
} from "./aes-gcm";
import { bytesToBase64Url, base64UrlToBytes, toBufferSource } from "./encoding";
import {
  buildDeviceVaultEnvelope,
  setSessionVaultKey,
  unwrapVaultKeyFromDevice,
} from "./vault";
import { storeLocalVaultEnvelope } from "./device-storage";

interface PrfClientExtensionResults {
  prf?: {
    results?: {
      first?: ArrayBuffer;
    };
  };
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

export function extractPasskeyPrfOutput(
  clientExtensionResults: AuthenticationExtensionsClientOutputs
): Uint8Array | null {
  const prf = (clientExtensionResults as PrfClientExtensionResults).prf;
  const first = prf?.results?.first;
  if (!first || first.byteLength < 32) return null;
  return new Uint8Array(first);
}

async function importPrfAsAesKey(prfOutput: Uint8Array): Promise<CryptoKey> {
  const keyBytes = prfOutput.byteLength === 32 ? prfOutput : prfOutput.slice(0, 32);
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(keyBytes),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function wrapVaultKeyForPasskey(
  vaultKey: CryptoKey,
  prfOutput: Uint8Array,
  userId: string,
  resourceId: string
): Promise<EncryptedPayload> {
  const prfKey = await importPrfAsAesKey(prfOutput);
  return encryptField(bytesToBase64Url(await exportAesKey(vaultKey)), prfKey, {
    userId,
    resourceId,
    field: "vault_key",
  });
}

export async function unwrapVaultKeyFromPasskey(
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array
): Promise<CryptoKey> {
  const prfKey = await importPrfAsAesKey(prfOutput);
  const keyBytes = base64UrlToBytes(await decryptField(encryptedVaultKey, prfKey));
  const vaultKey = await importAesKey(keyBytes);
  setSessionVaultKey(vaultKey);
  return vaultKey;
}

/** After passkey unlock, cache a trusted-device envelope for this browser. */
export async function persistUnlockedVaultOnDevice(
  vaultKey: CryptoKey,
  userId: string
): Promise<void> {
  const { encryptedVaultKey, deviceId } = await buildDeviceVaultEnvelope(
    vaultKey,
    userId,
    userId
  );
  await storeLocalVaultEnvelope(userId, deviceId, encryptedVaultKey);
}

export async function unlockVaultFromPasskeyEnvelope(
  userId: string,
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array | null
): Promise<CryptoKey> {
  if (prfOutput) {
    try {
      const vaultKey = await unwrapVaultKeyFromPasskey(encryptedVaultKey, prfOutput);
      await persistUnlockedVaultOnDevice(vaultKey, userId);
      return vaultKey;
    } catch {
      // Fall through for passkeys registered before PRF-based wrapping.
    }
  }

  const vaultKey = await unwrapVaultKeyFromDevice(userId, encryptedVaultKey);
  await persistUnlockedVaultOnDevice(vaultKey, userId);
  return vaultKey;
}
