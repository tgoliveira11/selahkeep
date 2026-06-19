import {
  createPasswordEnvelope,
  unlockWithPasswordEnvelope,
  type Argon2idKdfMetadata as VaultCoreArgon2idKdfMetadata,
  type EncryptedPayload as VaultCoreEncryptedPayload,
  type KdfMetadata as VaultCoreKdfMetadata,
} from "@tgoliveira/vault-core";
import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import { unlockVaultSession } from "../../client/vault-session";
import { setSessionVaultKey } from "../vault-key";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";

type WrapOptions = {
  userId: string;
  resourceId: string;
};

function asVaultCorePayload(payload: EncryptedPayload): VaultCoreEncryptedPayload {
  return payload as VaultCoreEncryptedPayload;
}

function applyUnlockedVaultKey(vaultKey: CryptoKey, explicit?: boolean): CryptoKey {
  if (explicit ?? true) {
    unlockVaultSession(vaultKey);
  } else {
    setSessionVaultKey(vaultKey);
  }
  return vaultKey;
}

export async function wrapVaultKeyForPassword(
  vaultKey: CryptoKey,
  vaultPassword: string,
  options: WrapOptions
): Promise<{ encryptedVaultKey: EncryptedPayload; kdfMetadata: VaultCoreArgon2idKdfMetadata }> {
  const { envelope, kdfMetadata } = await createPasswordEnvelope(
    vaultKey,
    vaultPassword,
    options,
    SELAHKEEP_VAULT_PROFILE
  );
  return {
    encryptedVaultKey: envelope.encryptedVaultKey as EncryptedPayload,
    kdfMetadata,
  };
}

export async function unwrapVaultKeyFromPassword(
  vaultPassword: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata,
  options?: { explicit?: boolean }
): Promise<CryptoKey> {
  const vaultKey = await unlockWithPasswordEnvelope(vaultPassword, {
    encryptedVaultKey: asVaultCorePayload(encryptedVaultKey),
    kdfMetadata: kdfMetadata as VaultCoreKdfMetadata,
  });
  return applyUnlockedVaultKey(vaultKey, options?.explicit);
}

export {
  createPasswordEnvelope,
  unlockWithPasswordEnvelope,
} from "@tgoliveira/vault-core";

export type { VaultCoreArgon2idKdfMetadata as Argon2idKdfMetadata };
