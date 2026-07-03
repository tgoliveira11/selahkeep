import { startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { apiClient } from "@/lib/api-client/client";
import { extractPasskeyPrfOutput, wrapVaultKeyForPasskey } from "@/lib/crypto-client/passkey-vault";
import { prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";
import {
  getPasskeyPrfDiagnosticMessage,
  resolveCeremonyDiagnosticReason,
} from "@/lib/passkey/passkey-prf-diagnostics";
import { preferPlatformTransportsForVaultUnlock } from "@/lib/passkey/passkey-transports";
import { toPasskeyCeremonyErrorMessage } from "@/lib/passkey/map-passkey-crypto-error";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

/**
 * Links vault unlock to a passkey using PRF from an authentication ceremony.
 * Registration PRF output can differ from assertion PRF on some mobile authenticators;
 * envelopes must always be created from assertion PRF.
 */
export async function enableVaultPasskeyUnlockWithAuthPrf(args: {
  passkeyDbId: string;
  userId: string;
  vaultKey: CryptoKey;
}): Promise<void> {
  try {
    const options = (await apiClient.post(
      `/api/account/passkeys/${args.passkeyDbId}/enable-vault-unlock`,
      { action: "options" }
    )) as PublicKeyCredentialRequestOptionsJSON;

    const assertion = await startAuthentication({
      optionsJSON: prepareAuthenticationOptions(preferPlatformTransportsForVaultUnlock(options)),
    });

    const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults, assertion.id);
    if (!prfOutput) {
      throw new Error(
        getPasskeyPrfDiagnosticMessage(resolveCeremonyDiagnosticReason({ prfOutputPresent: false }))
      );
    }

    const encryptedVaultKey: EncryptedPayload = await wrapVaultKeyForPasskey(
      args.vaultKey,
      prfOutput,
      args.userId,
      args.userId
    );

    await apiClient.post(`/api/account/passkeys/${args.passkeyDbId}/enable-vault-unlock`, {
      action: "verify",
      response: assertion,
      encryptedVaultKey,
      prfVaultEnvelope: true,
      prfSupported: true,
    });
  } catch (error) {
    throw new Error(
      toPasskeyCeremonyErrorMessage(error, "Could not enable passkey vault unlock.")
    );
  }
}
