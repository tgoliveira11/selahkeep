import { userVaultKeysEqual } from "@tgoliveira/vault-core";
import {
  extractPasskeyPrfOutput,
  unlockVaultFromPasskeyEnvelope,
} from "@/lib/crypto-client/passkey-vault";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  getPasskeyPrfDiagnosticMessage,
  resolveCeremonyDiagnosticReason,
} from "@/lib/passkey/passkey-prf-diagnostics";
import { PASSKEY_VAULT_UNLOCK_TEST_MISMATCH_MESSAGE } from "@/lib/passkey/messages";
import {
  runVaultUnlockAuthenticationCeremony,
  verifyVaultUnlockAuthentication,
} from "@/lib/passkey/vault-unlock-authenticate";

/**
 * Authentication ceremony + server verify + local decrypt, compared to the open session UVK.
 * Same checks as settings **Test** after passkey vault unlock is enabled.
 */
export async function verifyPasskeyVaultUnlockRoundTrip(args: {
  userId: string;
  sessionVaultKey: CryptoKey;
  credentialId?: string;
}): Promise<void> {
  const assertion = await runVaultUnlockAuthenticationCeremony(args.credentialId);
  const prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults, assertion.id);
  if (!prfOutput) {
    throw new Error(
      getPasskeyPrfDiagnosticMessage(
        resolveCeremonyDiagnosticReason({ prfOutputPresent: false })
      )
    );
  }

  const result = (await verifyVaultUnlockAuthentication(assertion)) as {
    verified: boolean;
    encryptedVaultKey: EncryptedPayload | null;
    prfRequired?: boolean;
  };

  if (!result.verified || !result.encryptedVaultKey) {
    throw new Error("This passkey is not linked to vault unlock.");
  }

  const derivedKey = await unlockVaultFromPasskeyEnvelope(
    args.userId,
    result.encryptedVaultKey,
    prfOutput,
    { prfRequired: result.prfRequired ?? true, applySession: false }
  );

  if (!(await userVaultKeysEqual(args.sessionVaultKey, derivedKey))) {
    throw new Error(PASSKEY_VAULT_UNLOCK_TEST_MISMATCH_MESSAGE);
  }
}
