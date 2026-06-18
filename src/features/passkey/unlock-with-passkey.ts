import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { apiClient } from "@/lib/api-client/client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  getPasskeyPrfDiagnosticMessage,
  resolveCeremonyDiagnosticReason,
} from "@/lib/passkey/passkey-prf-diagnostics";
import {
  extractPasskeyPrfOutput,
  PasskeyPrfRequiredError,
  unlockVaultFromPasskeyEnvelope,
} from "@/lib/crypto-client/passkey-vault";
import { logPasskeyLoginVaultEvent } from "@/features/passkey/passkey-login-audit";
import { prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";

interface PasskeyAuthResult {
  verified: boolean;
  encryptedVaultKey: EncryptedPayload | null;
  prfRequired?: boolean;
}

export async function unlockVaultWithPasskey(userId: string): Promise<CryptoKey> {
  const options = (await apiClient.post("/api/passkeys/authenticate", {
    action: "options",
  })) as PublicKeyCredentialRequestOptionsJSON;

  const assertion = await startAuthentication({
    optionsJSON: prepareAuthenticationOptions(options),
  });
  const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);

  const result = (await apiClient.post("/api/passkeys/authenticate", {
    action: "verify",
    response: assertion,
  })) as PasskeyAuthResult;

  if (!result.verified || !result.encryptedVaultKey) {
    throw new Error(
      "Passkey verified but no vault envelope is available. Set up a passkey again while your vault is unlocked."
    );
  }

  try {
    const vaultKey = await unlockVaultFromPasskeyEnvelope(
      userId,
      result.encryptedVaultKey,
      prfOutput,
      { prfRequired: result.prfRequired ?? true }
    );
    logPasskeyLoginVaultEvent("passkey_vault_unlock_succeeded", { method: "passkey" });
    return vaultKey;
  } catch (error) {
    logPasskeyLoginVaultEvent("passkey_vault_unlock_failed", {
      method: "passkey",
      errorCode: error instanceof Error && error.name === "PasskeyPrfRequiredError" ? "prf_required" : "unwrap_failed",
    });
    if (error instanceof PasskeyPrfRequiredError) {
      throw new Error(getPasskeyPrfDiagnosticMessage(resolveCeremonyDiagnosticReason({ prfOutputPresent: false })));
    }
    throw new Error(
      "Could not decrypt your vault with this passkey. Use your vault password or recovery phrase, or set up your passkey again from a PRF-capable browser."
    );
  }
}
