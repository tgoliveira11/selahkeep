import {
  createPasswordEnvelope,
  unlockWithPasswordEnvelope,
  type Argon2idKdfMetadata as VaultCoreArgon2idKdfMetadata,
  type EncryptedPayload as VaultCoreEncryptedPayload,
  type KdfMetadata as VaultCoreKdfMetadata,
} from "@tgoliveira/vault-core";
import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import {
  setUnlockedVaultSession,
  type VaultUnlockMethod,
} from "@/lib/crypto-client/vault-session";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";
import {
  isLegacyVaultKeyEnvelope,
  unwrapLegacyVaultKeyFromPassword,
} from "./legacy-envelope-unlock";

type WrapOptions = {
  userId: string;
  resourceId: string;
};

function asVaultCorePayload(payload: EncryptedPayload): VaultCoreEncryptedPayload {
  return payload as VaultCoreEncryptedPayload;
}

function envelopeScope(userId: string, resourceId?: string) {
  return { userId, resourceId: resourceId ?? userId };
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
  options?: {
    applySession?: boolean;
    unlockMethod?: VaultUnlockMethod;
    userId?: string;
    resourceId?: string;
  }
): Promise<CryptoKey> {
  const scope = envelopeScope(options?.userId ?? encryptedVaultKey.aad.userId, options?.resourceId);
  const vaultKey = isLegacyVaultKeyEnvelope(encryptedVaultKey)
    ? await unwrapLegacyVaultKeyFromPassword(
        vaultPassword,
        encryptedVaultKey,
        kdfMetadata,
        scope
      )
    : await unlockWithPasswordEnvelope(
        vaultPassword,
        {
          encryptedVaultKey: asVaultCorePayload(encryptedVaultKey),
          kdfMetadata: kdfMetadata as VaultCoreKdfMetadata,
        },
        scope,
        SELAHKEEP_VAULT_PROFILE
      );

  if (options?.applySession ?? true) {
    await setUnlockedVaultSession({
      userVaultKey: vaultKey,
      method: options?.unlockMethod ?? "password",
    });
  }
  return vaultKey;
}

export {
  createPasswordEnvelope,
  unlockWithPasswordEnvelope,
} from "@tgoliveira/vault-core";

export type { VaultCoreArgon2idKdfMetadata as Argon2idKdfMetadata };
