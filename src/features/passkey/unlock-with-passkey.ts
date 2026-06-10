import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { apiClient } from "@/lib/api-client/client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  extractPasskeyPrfOutput,
  unlockVaultFromPasskeyEnvelope,
} from "@/lib/crypto-client/passkey-vault";
import { prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";

interface PasskeyAuthResult {
  verified: boolean;
  encryptedVaultKey: EncryptedPayload | null;
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
    return await unlockVaultFromPasskeyEnvelope(
      userId,
      result.encryptedVaultKey,
      prfOutput
    );
  } catch {
    if (!prfOutput) {
      throw new Error(
        "This passkey cannot unlock your vault on a new browser yet. Use your recovery code, or re-register your passkey from a device where your vault is already unlocked."
      );
    }
    throw new Error(
      "Could not decrypt your vault with this passkey. Use your recovery code, or set up your passkey again from a trusted device."
    );
  }
}
