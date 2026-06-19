import {
  createPasskeyPrfEnvelope,
  unlockWithPasskeyPrfEnvelope,
  unlockVaultFromPasskeyEnvelope as unlockVaultFromPasskeyEnvelopeCore,
  unwrapVaultKeyFromPasskey as unwrapVaultKeyFromPasskeyCore,
  type EncryptedPayload as VaultCoreEncryptedPayload,
} from "@tgoliveira/vault-core";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { unlockVaultSession } from "../../client/vault-session";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";

function asVaultCorePayload(payload: EncryptedPayload): VaultCoreEncryptedPayload {
  return payload as VaultCoreEncryptedPayload;
}

export async function wrapVaultKeyForPasskey(
  vaultKey: CryptoKey,
  prfOutput: Uint8Array,
  userId: string,
  resourceId: string,
  publicMetadata?: Record<string, unknown>
): Promise<EncryptedPayload> {
  const envelope = await createPasskeyPrfEnvelope(
    vaultKey,
    prfOutput,
    { userId, resourceId },
    SELAHKEEP_VAULT_PROFILE,
    publicMetadata
  );
  return envelope.encryptedVaultKey as EncryptedPayload;
}

export async function unwrapVaultKeyFromPasskey(
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array
): Promise<CryptoKey> {
  const vaultKey = await unwrapVaultKeyFromPasskeyCore(
    asVaultCorePayload(encryptedVaultKey),
    prfOutput
  );
  unlockVaultSession(vaultKey);
  return vaultKey;
}

export async function unlockVaultFromPasskeyEnvelope(
  userId: string,
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array | null,
  options?: { prfRequired?: boolean }
): Promise<CryptoKey> {
  void userId;
  const vaultKey = await unlockVaultFromPasskeyEnvelopeCore(
    asVaultCorePayload(encryptedVaultKey),
    prfOutput,
    options
  );
  unlockVaultSession(vaultKey);
  return vaultKey;
}

export {
  PasskeyPrfRequiredError,
  PasskeyUnlockError,
  createPasskeyPrfEnvelope,
  unlockWithPasskeyPrfEnvelope,
} from "@tgoliveira/vault-core";
