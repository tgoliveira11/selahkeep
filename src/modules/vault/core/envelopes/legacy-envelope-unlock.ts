import {
  base64UrlToBytes,
  deriveRecoveryPhraseKeyFromMetadata,
  deriveVaultPasswordKeyFromMetadata,
  importAesKey,
  toBufferSource,
} from "@tgoliveira/vault-core";
import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import { importAesKey as importLocalAesKey } from "@/lib/crypto-client/aes-gcm";
import { stringToBytes } from "@/lib/crypto-client/encoding";
import { aadByteCandidates as localAadByteCandidates } from "@/lib/crypto-client/aad";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";

type VaultKeyScope = { userId: string; resourceId: string };

type AadWithOptionalContext = EncryptedPayload["aad"] & { context?: string | null };

/** Envelopes that must not use strict vault-core profile AAD assert (pre-profile or DB-null context). */
export function isLegacyVaultKeyEnvelope(payload: EncryptedPayload): boolean {
  const aad = payload.aad as AadWithOptionalContext;
  if (aad.field !== "vault_key") return false;
  if (aad.context === undefined || aad.context === null) return true;
  return aad.context !== SELAHKEEP_VAULT_PROFILE.aadContextEnvelope;
}

export function assertLegacyVaultKeyScope(scope: VaultKeyScope, payload: EncryptedPayload): void {
  if (payload.aad.userId !== scope.userId) {
    throw new Error("Vault key AAD userId mismatch");
  }
  if (payload.aad.resourceId !== scope.resourceId) {
    throw new Error("Vault key AAD resourceId mismatch");
  }
  if (payload.aad.field !== "vault_key") {
    throw new Error("Vault key AAD field mismatch");
  }
}

function vaultCoreCanonicalAadString(aad: AadWithOptionalContext): string {
  return JSON.stringify({
    context: aad.context,
    field: aad.field,
    resourceId: aad.resourceId,
    userId: aad.userId,
  });
}

/** Pre-profile + profile-tagged byte candidates for stored vault_key envelopes. */
export function legacyVaultKeyAadByteCandidates(aad: AadWithOptionalContext): Uint8Array[] {
  const variants = new Set<string>();

  for (const bytes of localAadByteCandidates(aad)) {
    variants.add(new TextDecoder().decode(bytes));
  }

  const withoutContext: AadWithOptionalContext = {
    userId: aad.userId,
    resourceId: aad.resourceId,
    field: aad.field,
  };
  for (const bytes of localAadByteCandidates(withoutContext)) {
    variants.add(new TextDecoder().decode(bytes));
  }

  const withProfileContext: AadWithOptionalContext = {
    ...withoutContext,
    context: SELAHKEEP_VAULT_PROFILE.aadContextEnvelope,
  };
  variants.add(vaultCoreCanonicalAadString(withProfileContext));
  variants.add(
    JSON.stringify({
      userId: withProfileContext.userId,
      resourceId: withProfileContext.resourceId,
      field: withProfileContext.field,
      context: withProfileContext.context,
    })
  );
  variants.add(vaultCoreCanonicalAadString(aad));
  variants.add(JSON.stringify(aad));

  return Array.from(variants).map((value) => stringToBytes(value));
}

async function decryptLegacyVaultKeyField(
  payload: EncryptedPayload,
  derivedKey: CryptoKey
): Promise<string> {
  const iv = base64UrlToBytes(payload.iv);
  const ciphertext = base64UrlToBytes(payload.ciphertext);
  let lastError: unknown;

  for (const aadBytes of legacyVaultKeyAadByteCandidates(payload.aad as AadWithOptionalContext)) {
    try {
      const plaintextBuffer = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: toBufferSource(iv),
          additionalData: toBufferSource(aadBytes),
        },
        derivedKey,
        toBufferSource(ciphertext)
      );
      return new TextDecoder().decode(plaintextBuffer);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Incorrect vault password or recovery phrase");
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

export async function unwrapLegacyVaultKeyFromPassword(
  vaultPassword: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata,
  scope: VaultKeyScope
): Promise<CryptoKey> {
  if (kdfMetadata.kdf !== "argon2id") {
    throw new Error("Vault password envelope requires Argon2id metadata");
  }
  assertLegacyVaultKeyScope(scope, encryptedVaultKey);
  const derivedKey = await deriveVaultPasswordKeyFromMetadata(vaultPassword, kdfMetadata);
  try {
    const keyBytes = base64UrlToBytes(
      await decryptLegacyVaultKeyField(encryptedVaultKey, derivedKey)
    );
    return importAesKey(keyBytes);
  } catch {
    throw new Error("Incorrect vault password");
  }
}

export async function unwrapLegacyVaultKeyFromRecoveryPhrase(
  recoveryPhrase: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata,
  scope: VaultKeyScope
): Promise<CryptoKey> {
  if (kdfMetadata.kdf !== "argon2id") {
    throw new Error("Recovery phrase envelope requires Argon2id metadata");
  }
  assertLegacyVaultKeyScope(scope, encryptedVaultKey);
  const derivedKey = await deriveRecoveryPhraseKeyFromMetadata(recoveryPhrase, kdfMetadata);
  try {
    const keyBytes = base64UrlToBytes(
      await decryptLegacyVaultKeyField(encryptedVaultKey, derivedKey)
    );
    return importAesKey(keyBytes);
  } catch {
    throw new Error("Incorrect recovery phrase");
  }
}

export async function unwrapLegacyVaultKeyFromPasskey(
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array,
  scope: VaultKeyScope
): Promise<CryptoKey> {
  if (prfOutput.byteLength < 32) {
    throw new Error("PRF output must be at least 32 bytes");
  }
  assertLegacyVaultKeyScope(scope, encryptedVaultKey);
  const prfKey = await importPrfAsAesKey(prfOutput);
  try {
    const keyBytes = base64UrlToBytes(
      await decryptLegacyVaultKeyField(encryptedVaultKey, prfKey)
    );
    return importLocalAesKey(keyBytes);
  } catch {
    throw new Error("Could not decrypt your vault with this passkey");
  }
}
