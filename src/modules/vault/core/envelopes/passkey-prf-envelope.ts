import {
  createPasskeyPrfEnvelope,
  unlockWithPasskeyPrfEnvelope,
  unlockVaultFromPasskeyEnvelope as unlockVaultFromPasskeyEnvelopeCore,
  unwrapVaultKeyFromPasskey as unwrapVaultKeyFromPasskeyCore,
  type EncryptedPayload as VaultCoreEncryptedPayload,
} from "@tgoliveira/vault-core";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { setUnlockedVaultSession } from "@/lib/crypto-client/vault-session";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";
import {
  normalizeVaultKeyEnvelopeAadContext,
  shouldRoutePasskeyVaultKeyToLegacyUnlock,
  unwrapLegacyVaultKeyFromPasskey,
} from "./legacy-envelope-unlock";
import {
  cacheVaultInnerKeyMaterialFromPasskeyEnvelope,
  createPasskeyEncryptedVaultKey,
} from "./vault-inner-key-material";

function asVaultCorePayload(payload: EncryptedPayload): VaultCoreEncryptedPayload {
  return payload as VaultCoreEncryptedPayload;
}

function envelopeScope(userId: string, resourceId?: string) {
  return { userId, resourceId: resourceId ?? userId };
}

function preparePasskeyVaultKeyEnvelope(encryptedVaultKey: EncryptedPayload): {
  payload: EncryptedPayload;
  useLegacyUnlock: boolean;
} {
  const useLegacyUnlock = shouldRoutePasskeyVaultKeyToLegacyUnlock(encryptedVaultKey);
  return {
    useLegacyUnlock,
    payload: useLegacyUnlock
      ? encryptedVaultKey
      : normalizeVaultKeyEnvelopeAadContext(encryptedVaultKey),
  };
}

export async function wrapVaultKeyForPasskey(
  vaultKey: CryptoKey,
  prfOutput: Uint8Array,
  userId: string,
  resourceId: string
): Promise<EncryptedPayload> {
  // Re-wraps cached inner key material when the session UVK is non-extractable
  // (the normal state after unlock), so passkey enrollment works post-unlock.
  return createPasskeyEncryptedVaultKey(vaultKey, prfOutput, { userId, resourceId });
}

export async function unwrapVaultKeyFromPasskey(
  encryptedVaultKey: EncryptedPayload,
  prfOutput: Uint8Array,
  options?: { applySession?: boolean; userId?: string; resourceId?: string }
): Promise<CryptoKey> {
  const scope = envelopeScope(options?.userId ?? encryptedVaultKey.aad.userId, options?.resourceId);
  const { payload, useLegacyUnlock } = preparePasskeyVaultKeyEnvelope(encryptedVaultKey);
  const vaultKey = useLegacyUnlock
    ? await unwrapLegacyVaultKeyFromPasskey(payload, prfOutput, scope)
    : await unwrapVaultKeyFromPasskeyCore(
        asVaultCorePayload(payload),
        prfOutput,
        scope,
        SELAHKEEP_VAULT_PROFILE
      );

  if (!useLegacyUnlock) {
    await cacheVaultInnerKeyMaterialFromPasskeyEnvelope(payload, prfOutput);
  }

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
  const { payload, useLegacyUnlock } = preparePasskeyVaultKeyEnvelope(encryptedVaultKey);
  const vaultKey = useLegacyUnlock
    ? await (async () => {
        if (!prfOutput) {
          throw new Error("Passkey PRF output is required to unlock this vault");
        }
        return unwrapLegacyVaultKeyFromPasskey(payload, prfOutput, scope);
      })()
    : await unlockVaultFromPasskeyEnvelopeCore(
        asVaultCorePayload(payload),
        prfOutput,
        scope,
        SELAHKEEP_VAULT_PROFILE,
        { prfRequired: options?.prfRequired }
      );

  if (!useLegacyUnlock && prfOutput) {
    await cacheVaultInnerKeyMaterialFromPasskeyEnvelope(payload, prfOutput);
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
