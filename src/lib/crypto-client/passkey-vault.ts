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
} from "./vault";
import { storeLocalVaultEnvelope } from "./device-storage";

interface PrfClientExtensionResults {
  prf?: {
    results?: {
      first?: ArrayBuffer;
    };
  };
}

export class PasskeyPrfRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasskeyPrfRequiredError";
  }
}

export class PasskeyUnlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasskeyUnlockError";
  }
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

/**
 * Passkey authentication proves identity; PRF output unwraps the vault envelope.
 * PRF is required for passkey vault envelopes — no silent fallback to device secrets.
 */
export async function unlockVaultFromPasskeyEnvelope(
  userId: string,
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array | null,
  options?: { prfRequired?: boolean }
): Promise<CryptoKey> {
  const prfRequired = options?.prfRequired ?? true;

  if (prfRequired && !prfOutput) {
    throw new PasskeyPrfRequiredError(
      "This passkey requires browser PRF support to unlock your vault. Use your recovery code or a trusted device, or re-register your passkey from a PRF-capable browser."
    );
  }

  if (!prfOutput) {
    throw new PasskeyUnlockError(
      "Could not unlock your vault with this passkey. Use your recovery code or a trusted device."
    );
  }

  try {
    const vaultKey = await unwrapVaultKeyFromPasskey(encryptedVaultKey, prfOutput);
    await persistUnlockedVaultOnDevice(vaultKey, userId);
    const { recordTrustedDeviceUnlock } = await import("./record-device-unlock");
    void recordTrustedDeviceUnlock(userId);
    return vaultKey;
  } catch {
    throw new PasskeyUnlockError(
      "Could not decrypt your vault with this passkey. Use your recovery code, or set up your passkey again from a trusted device."
    );
  }
}
