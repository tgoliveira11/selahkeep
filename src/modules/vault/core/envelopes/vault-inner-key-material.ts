import {
  bytesToBase64Url,
  base64UrlToBytes,
  decryptField,
  encryptField,
  importUserVaultKey,
  toBufferSource,
  userVaultKeysEqual,
  VaultKeyNotExtractableError,
  type EncryptedPayload as VaultCoreEncryptedPayload,
} from "@tgoliveira/vault-core";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { prfBytesForAes256Import } from "@/lib/passkey/normalize-prf-output";
import { PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE } from "@/lib/passkey/messages";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";

type VaultKeyScope = { userId: string; resourceId: string };

export type CachedVaultInnerKeyMaterial = {
  inner: Uint8Array;
  /** Null when `inner` is legacy raw 32-byte UVK material. */
  wrappingKey: CryptoKey | null;
};

let cachedInnerKeyMaterial: CachedVaultInnerKeyMaterial | null = null;

export function cacheVaultInnerKeyMaterial(material: CachedVaultInnerKeyMaterial | null): void {
  cachedInnerKeyMaterial = material;
}

export function getCachedVaultInnerKeyMaterial(): CachedVaultInnerKeyMaterial | null {
  return cachedInnerKeyMaterial;
}

export function clearVaultInnerKeyMaterial(): void {
  cachedInnerKeyMaterial = null;
}

export function isLegacyRawVaultKeyMaterial(bytes: Uint8Array): boolean {
  return bytes.byteLength === 32;
}

async function importPrfAsAesGcmKey(prfOutput: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(prfBytesForAes256Import(prfOutput)),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function importPrfAsAesKwKey(prfOutput: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(prfBytesForAes256Import(prfOutput)),
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

export async function cacheVaultInnerKeyMaterialFromEnvelope(
  encryptedVaultKey: EncryptedPayload,
  encryptionKey: CryptoKey,
  wrappingKey: CryptoKey | null
): Promise<void> {
  const inner = base64UrlToBytes(
    await decryptField(encryptedVaultKey as VaultCoreEncryptedPayload, encryptionKey)
  );
  cacheVaultInnerKeyMaterial({ inner, wrappingKey });
}

export function cacheLegacyRawVaultInnerKeyMaterial(inner: Uint8Array): void {
  cacheVaultInnerKeyMaterial({ inner, wrappingKey: null });
}

export async function cacheVaultInnerKeyMaterialFromPasskeyEnvelope(
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array
): Promise<void> {
  const encryptionKey = await importPrfAsAesGcmKey(prfOutput);
  const wrappingKey = await importPrfAsAesKwKey(prfOutput);
  await cacheVaultInnerKeyMaterialFromEnvelope(encryptedVaultKey, encryptionKey, wrappingKey);
}

async function assertInnerVaultKeyBlobMatchesVaultKey(
  inner: Uint8Array,
  vaultKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<void> {
  const uvkFromInner = isLegacyRawVaultKeyMaterial(inner)
    ? await importUserVaultKey(inner)
    : await crypto.subtle.unwrapKey(
        "raw",
        toBufferSource(inner),
        wrappingKey,
        "AES-KW",
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
  if (!(await userVaultKeysEqual(uvkFromInner, vaultKey))) {
    throw new Error("Inner vault key blob does not match the session vault key");
  }
}

async function rewrapInnerVaultKeyMaterialForPrf(
  inner: Uint8Array,
  oldWrappingKey: CryptoKey | null,
  newWrappingKey: CryptoKey,
  sessionVaultKey: CryptoKey
): Promise<Uint8Array> {
  const uvkForRewrap = isLegacyRawVaultKeyMaterial(inner)
    ? await importUserVaultKey(inner, { extractable: true })
    : await crypto.subtle.unwrapKey(
        "raw",
        toBufferSource(inner),
        oldWrappingKey!,
        "AES-KW",
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
  if (!(await userVaultKeysEqual(uvkForRewrap, sessionVaultKey))) {
    throw new Error("Vault key mismatch during passkey envelope re-wrap");
  }
  const wrapped = await crypto.subtle.wrapKey("raw", uvkForRewrap, newWrappingKey, "AES-KW");
  return new Uint8Array(wrapped);
}

async function materializeInnerVaultKeyBlob(
  vaultKey: CryptoKey,
  wrappingKey: CryptoKey,
  innerVaultKeyBlob?: Uint8Array
): Promise<Uint8Array> {
  if (innerVaultKeyBlob) {
    await assertInnerVaultKeyBlobMatchesVaultKey(innerVaultKeyBlob, vaultKey, wrappingKey);
    return innerVaultKeyBlob;
  }
  try {
    const wrapped = await crypto.subtle.wrapKey("raw", vaultKey, wrappingKey, "AES-KW");
    return new Uint8Array(wrapped);
  } catch {
    throw new VaultKeyNotExtractableError(
      "Cannot wrap a non-extractable vault key. Re-wrap using innerVaultKeyBlob from the current envelope, or create the first envelope immediately after createUserVaultKey()."
    );
  }
}

/**
 * Creates a passkey PRF vault-key envelope, reusing cached inner material when the session UVK
 * is non-extractable (vault-core 1.0+ session keys after unlock).
 */
export async function createPasskeyEncryptedVaultKey(
  vaultKey: CryptoKey,
  prfOutput: Uint8Array,
  scope: VaultKeyScope
): Promise<EncryptedPayload> {
  if (prfOutput.byteLength < 32) {
    throw new Error("PRF output must be at least 32 bytes");
  }

  const prfEncryptionKey = await importPrfAsAesGcmKey(prfOutput);
  const newWrappingKey = await importPrfAsAesKwKey(prfOutput);

  const cached = getCachedVaultInnerKeyMaterial();
  let innerVaultKeyBlob: Uint8Array | undefined;
  try {
    if (cached) {
      try {
        innerVaultKeyBlob = await rewrapInnerVaultKeyMaterialForPrf(
          cached.inner,
          cached.wrappingKey,
          newWrappingKey,
          vaultKey
        );
      } catch {
        clearVaultInnerKeyMaterial();
      }
    }

    const inner = await materializeInnerVaultKeyBlob(vaultKey, newWrappingKey, innerVaultKeyBlob);
    const encryptedVaultKey = await encryptField(
      bytesToBase64Url(inner),
      prfEncryptionKey,
      { ...scope, field: "vault_key" },
      SELAHKEEP_VAULT_PROFILE
    );
    return encryptedVaultKey as EncryptedPayload;
  } catch (error) {
    if (!cached && error instanceof VaultKeyNotExtractableError) {
      throw new Error(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE);
    }
    throw error;
  }
}
