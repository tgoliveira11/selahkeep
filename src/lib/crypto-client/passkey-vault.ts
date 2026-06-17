import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { AuthenticationExtensionsClientOutputs } from "@simplewebauthn/browser";
import {
  encryptField,
  decryptField,
  exportAesKey,
  importAesKey,
} from "./aes-gcm";
import { bytesToBase64Url, base64UrlToBytes, toBufferSource } from "./encoding";
import { unlockVaultSession } from "./vault-session";

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
  unlockVaultSession(vaultKey);
  return vaultKey;
}

/**
 * Passkey authentication proves identity; PRF output unwraps the vault envelope.
 * PRF is required for passkey vault envelopes — no device-secret fallback.
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
      "This passkey requires browser PRF support to unlock your vault. Use your vault password or recovery phrase, or re-register your passkey from a PRF-capable browser."
    );
  }

  if (!prfOutput) {
    throw new PasskeyUnlockError(
      "Could not unlock your vault with this passkey. Use your vault password or recovery phrase."
    );
  }

  try {
    return await unwrapVaultKeyFromPasskey(encryptedVaultKey, prfOutput);
  } catch {
    throw new PasskeyUnlockError(
      "Could not decrypt your vault with this passkey. Use your vault password or recovery phrase, or set up your passkey again from a PRF-capable browser."
    );
  }
}
