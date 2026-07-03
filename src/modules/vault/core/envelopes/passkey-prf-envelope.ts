import {
  unlockWithPasskeyPrfEnvelope,
  unlockVaultFromPasskeyEnvelope as unlockVaultFromPasskeyEnvelopeCore,
  unwrapVaultKeyFromPasskey as unwrapVaultKeyFromPasskeyCore,
  normalizeEnvelopeAadContext,
  VaultKeyNotExtractableError,
  VaultAuthorizationError,
  type EncryptedPayload as VaultCoreEncryptedPayload,
} from "@tgoliveira/vault-core";
import {
  createPasskeyPrfEnvelopeWithSessionCache,
  INNER_VAULT_KEY_CACHE_MISMATCH_MESSAGE,
  cacheVaultInnerKeyMaterialFromPasskeyUnlock,
} from "@tgoliveira/vault-core/browser";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { setUnlockedVaultSession } from "@/lib/crypto-client/vault-session";
import { PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE } from "@/lib/passkey/messages";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";

function asVaultCorePayload(payload: EncryptedPayload): VaultCoreEncryptedPayload {
  return payload as VaultCoreEncryptedPayload;
}

function envelopeScope(userId: string, resourceId?: string) {
  return { userId, resourceId: resourceId ?? userId };
}

export async function wrapVaultKeyForPasskey(
  vaultKey: CryptoKey,
  prfOutput: Uint8Array,
  userId: string,
  resourceId: string
): Promise<EncryptedPayload> {
  try {
    const envelope = await createPasskeyPrfEnvelopeWithSessionCache(
      vaultKey,
      prfOutput,
      { userId, resourceId },
      SELAHKEEP_VAULT_PROFILE
    );
    return envelope.encryptedVaultKey as EncryptedPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      error instanceof VaultKeyNotExtractableError ||
      message.includes("Cannot wrap a non-extractable vault key") ||
      (error instanceof VaultAuthorizationError &&
        message.includes(INNER_VAULT_KEY_CACHE_MISMATCH_MESSAGE))
    ) {
      throw new Error(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE);
    }
    if (message.includes(INNER_VAULT_KEY_CACHE_MISMATCH_MESSAGE)) {
      throw new Error(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE);
    }
    throw error;
  }
}

export async function unwrapVaultKeyFromPasskey(
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array,
  options?: { applySession?: boolean; userId?: string; resourceId?: string }
): Promise<CryptoKey> {
  const scope = envelopeScope(options?.userId ?? encryptedVaultKey.aad.userId, options?.resourceId);
  const payload = normalizeEnvelopeAadContext(
    asVaultCorePayload(encryptedVaultKey),
    SELAHKEEP_VAULT_PROFILE
  );
  const vaultKey = await unwrapVaultKeyFromPasskeyCore(
    payload,
    prfOutput,
    scope,
    SELAHKEEP_VAULT_PROFILE
  );

  await cacheVaultInnerKeyMaterialFromPasskeyUnlock(
    vaultKey,
    { encryptedVaultKey: payload },
    prfOutput
  );

  if (options?.applySession ?? true) {
    await setUnlockedVaultSession({ userVaultKey: vaultKey, method: "passkey_prf" });
  }
  return vaultKey;
}

export async function unlockVaultFromPasskeyEnvelope(
  userId: string,
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array | null,
  options?: { prfRequired?: boolean; applySession?: boolean; resourceId?: string }
): Promise<CryptoKey> {
  const scope = envelopeScope(userId, options?.resourceId);
  const payload = normalizeEnvelopeAadContext(
    asVaultCorePayload(encryptedVaultKey),
    SELAHKEEP_VAULT_PROFILE
  );
  const vaultKey = await unlockVaultFromPasskeyEnvelopeCore(
    payload,
    prfOutput,
    scope,
    SELAHKEEP_VAULT_PROFILE,
    { prfRequired: options?.prfRequired }
  );

  if (prfOutput) {
    await cacheVaultInnerKeyMaterialFromPasskeyUnlock(
      vaultKey,
      { encryptedVaultKey: payload },
      prfOutput
    );
  }

  if (options?.applySession ?? true) {
    await setUnlockedVaultSession({ userVaultKey: vaultKey, method: "passkey_prf" });
  }
  return vaultKey;
}

export {
  PasskeyPrfRequiredError,
  PasskeyUnlockError,
  createPasskeyPrfEnvelope,
  unlockWithPasskeyPrfEnvelope,
} from "@tgoliveira/vault-core";
