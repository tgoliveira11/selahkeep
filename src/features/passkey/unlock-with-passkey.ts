import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  getPasskeyPrfDiagnosticMessage,
  resolveCeremonyDiagnosticReason,
} from "@/lib/passkey/passkey-prf-diagnostics";
import {
  PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE,
  PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE,
  PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE,
} from "@/lib/passkey/messages";
import {
  extractPasskeyPrfOutput,
  PasskeyPrfRequiredError,
  unlockVaultFromPasskeyEnvelope,
} from "@/lib/crypto-client/passkey-vault";
import { logPasskeyVaultEvent } from "@/features/passkey/passkey-vault-audit";
import {
  runVaultUnlockAuthenticationCeremony,
  verifyVaultUnlockAuthentication,
} from "@/lib/passkey/vault-unlock-authenticate";

interface PasskeyAuthResult {
  verified: boolean;
  encryptedVaultKey: EncryptedPayload | null;
  prfRequired?: boolean;
}

export async function unlockVaultWithPasskey(
  userId: string,
  credentialId?: string
): Promise<CryptoKey> {
  let assertion;
  try {
    assertion = await runVaultUnlockAuthenticationCeremony(credentialId);
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

  const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);

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

  try {
    const vaultKey = await unlockVaultFromPasskeyEnvelope(
      userId,
      result.encryptedVaultKey,
      prfOutput,
      { prfRequired: result.prfRequired ?? true }
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
    throw new Error(
      "Could not decrypt your vault with this passkey. Use your vault password or recovery phrase, or set up your passkey again from a PRF-capable browser."
    );
  }
}
