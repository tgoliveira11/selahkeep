import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  getPasskeyPrfDiagnosticMessage,
  resolveCeremonyDiagnosticReason,
} from "@/lib/passkey/passkey-prf-diagnostics";
import { mapPasskeyCryptoError } from "@/lib/passkey/map-passkey-crypto-error";
import {
  PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE,
  PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE,
  PASSKEY_UNLOCK_IOS_PRF_TOO_OLD_MESSAGE,
  PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE,
  PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE,
} from "@/lib/passkey/messages";
import {
  extractPasskeyPrfOutput,
  PasskeyPrfRequiredError,
  PasskeyUnlockError,
  unlockVaultFromPasskeyEnvelope,
} from "@/lib/crypto-client/passkey-vault";
import { isAppleMobileBelowPrfMinimum } from "@/lib/passkey/prf-support";
import { resolveSingleVaultUnlockCredentialId } from "@/lib/passkey/vault-unlock-credential";
import { logPasskeyVaultEvent } from "@/features/passkey/passkey-vault-audit";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import {
  runVaultUnlockAuthenticationCeremony,
  runVaultUnlockAuthenticationCeremonyWithOptions,
  verifyVaultUnlockAuthentication,
} from "@/lib/passkey/vault-unlock-authenticate";

interface PasskeyAuthResult {
  verified: boolean;
  encryptedVaultKey: EncryptedPayload | null;
  prfRequired?: boolean;
}

export async function unlockVaultWithPasskey(
  userId: string,
  credentialId?: string,
  prefetchedOptions?: PublicKeyCredentialRequestOptionsJSON | null
): Promise<CryptoKey> {
  const effectiveCredentialId =
    credentialId ?? (await resolveSingleVaultUnlockCredentialId());

  let assertion;
  try {
    assertion = prefetchedOptions
      ? await runVaultUnlockAuthenticationCeremonyWithOptions(
          prefetchedOptions,
          effectiveCredentialId
        )
      : await runVaultUnlockAuthenticationCeremony(effectiveCredentialId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE)) {
      throw new Error(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE);
    }
    if (message.includes(PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE)) {
      throw new Error(PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE);
    }
    throw error;
  }

  const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults, assertion.id);

  let result: PasskeyAuthResult;
  try {
    result = (await verifyVaultUnlockAuthentication(assertion)) as PasskeyAuthResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE)) {
      throw new Error(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE);
    }
    if (message.includes(PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE)) {
      throw new Error(PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE);
    }
    if (message.includes(PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE)) {
      throw new Error(PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE);
    }
    throw error;
  }

  if (!result.verified || !result.encryptedVaultKey) {
    throw new Error(PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE);
  }

  const prfRequired = result.prfRequired ?? true;
  if (prfRequired && !prfOutput) {
    logPasskeyVaultEvent("passkey_vault_unlock_failed", {
      method: "passkey",
      errorCode: "prf_required",
    });
    throw new Error(
      getPasskeyPrfDiagnosticMessage(
        resolveCeremonyDiagnosticReason({ prfOutputPresent: false })
      )
    );
  }

  try {
    const vaultKey = await unlockVaultFromPasskeyEnvelope(
      userId,
      result.encryptedVaultKey,
      prfOutput,
      { prfRequired }
    );
    logPasskeyVaultEvent("passkey_vault_unlock_succeeded", { method: "passkey" });
    return vaultKey;
  } catch (error) {
    logPasskeyVaultEvent("passkey_vault_unlock_failed", {
      method: "passkey",
      errorCode:
        error instanceof Error && error.name === "PasskeyPrfRequiredError"
          ? "prf_required"
          : "unwrap_failed",
    });
    if (error instanceof PasskeyPrfRequiredError) {
      throw new Error(
        getPasskeyPrfDiagnosticMessage(
          resolveCeremonyDiagnosticReason({ prfOutputPresent: false })
        )
      );
    }
    if (error instanceof PasskeyUnlockError) {
      throw new Error(mapPasskeyCryptoError(error) ?? resolvePasskeyVaultDecryptFailureMessage());
    }
    throw new Error(mapPasskeyCryptoError(error) ?? resolvePasskeyVaultDecryptFailureMessage());
  }
}

function resolvePasskeyVaultDecryptFailureMessage(): string {
  if (isAppleMobileBelowPrfMinimum()) {
    return PASSKEY_UNLOCK_IOS_PRF_TOO_OLD_MESSAGE;
  }
  return PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE;
}
