import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import { encryptField, decryptField, exportAesKey, importAesKey } from "./aes-gcm";
import { bytesToBase64Url, base64UrlToBytes } from "./encoding";
import { deriveVaultPasswordKey, deriveVaultPasswordKeyFromMetadata } from "./vault-kdf";
import {
  deriveRecoveryPhraseKey,
  deriveRecoveryPhraseKeyFromMetadata,
} from "./recovery-phrase";
import type { Argon2idKdfMetadata } from "./argon2id";
import { unlockVaultSession } from "./vault-session";
import { setSessionVaultKey } from "./vault";

type WrapOptions = {
  userId: string;
  resourceId: string;
};

function applyUnlockedVaultKey(vaultKey: CryptoKey, explicit?: boolean): CryptoKey {
  if (explicit ?? true) {
    unlockVaultSession(vaultKey);
  } else {
    setSessionVaultKey(vaultKey);
  }
  return vaultKey;
}

async function wrapVaultKeyWithDerivedKey(
  vaultKey: CryptoKey,
  derivedKey: CryptoKey,
  { userId, resourceId }: WrapOptions
): Promise<EncryptedPayload> {
  return encryptField(bytesToBase64Url(await exportAesKey(vaultKey)), derivedKey, {
    userId,
    resourceId,
    field: "vault_key",
  });
}

async function unwrapVaultKeyWithDerivedKey(
  encryptedVaultKey: EncryptedPayload,
  derivedKey: CryptoKey
): Promise<CryptoKey> {
  const keyBytes = base64UrlToBytes(await decryptField(encryptedVaultKey, derivedKey));
  return importAesKey(keyBytes);
}

export async function wrapVaultKeyForPassword(
  vaultKey: CryptoKey,
  vaultPassword: string,
  options: WrapOptions
): Promise<{ encryptedVaultKey: EncryptedPayload; kdfMetadata: Argon2idKdfMetadata }> {
  const { key: derivedKey, metadata } = await deriveVaultPasswordKey(vaultPassword);
  const encryptedVaultKey = await wrapVaultKeyWithDerivedKey(vaultKey, derivedKey, options);
  return { encryptedVaultKey, kdfMetadata: metadata };
}

export async function unwrapVaultKeyFromPassword(
  vaultPassword: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata,
  options?: { explicit?: boolean }
): Promise<CryptoKey> {
  if (kdfMetadata.kdf !== "argon2id") {
    throw new Error("Vault password envelope requires Argon2id metadata");
  }
  const derivedKey = await deriveVaultPasswordKeyFromMetadata(vaultPassword, kdfMetadata);
  const vaultKey = await unwrapVaultKeyWithDerivedKey(encryptedVaultKey, derivedKey);
  return applyUnlockedVaultKey(vaultKey, options?.explicit);
}

export async function wrapVaultKeyForRecoveryPhrase(
  vaultKey: CryptoKey,
  recoveryPhrase: string,
  options: WrapOptions
): Promise<{ encryptedVaultKey: EncryptedPayload; kdfMetadata: Argon2idKdfMetadata }> {
  const { key: derivedKey, metadata } = await deriveRecoveryPhraseKey(recoveryPhrase);
  const encryptedVaultKey = await wrapVaultKeyWithDerivedKey(vaultKey, derivedKey, options);
  return { encryptedVaultKey, kdfMetadata: metadata };
}

export async function unwrapVaultKeyFromRecoveryPhrase(
  recoveryPhrase: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata,
  options?: { explicit?: boolean }
): Promise<CryptoKey> {
  if (kdfMetadata.kdf !== "argon2id") {
    throw new Error("Recovery phrase envelope requires Argon2id metadata");
  }
  const derivedKey = await deriveRecoveryPhraseKeyFromMetadata(recoveryPhrase, kdfMetadata);
  const vaultKey = await unwrapVaultKeyWithDerivedKey(encryptedVaultKey, derivedKey);
  return applyUnlockedVaultKey(vaultKey, options?.explicit);
}
