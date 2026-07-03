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
  /** Reuse enable-step PRF + envelope during setup to avoid a redundant auth ceremony. */
  knownUnlock?: {
    prfOutput: Uint8Array;
    encryptedVaultKey: EncryptedPayload;
    prfRequired?: boolean;
  };
}): Promise<void> {
  let prfOutput: Uint8Array;
  let encryptedVaultKey: EncryptedPayload;
  let prfRequired = true;

  if (args.knownUnlock) {
    prfOutput = args.knownUnlock.prfOutput;
    encryptedVaultKey = args.knownUnlock.encryptedVaultKey;
    prfRequired = args.knownUnlock.prfRequired ?? true;
  } else {
    const assertion = await runVaultUnlockAuthenticationCeremony(args.credentialId);
    const extractedPrf = extractPasskeyPrfOutput(assertion.clientExtensionResults, assertion.id);
    if (!extractedPrf) {
      throw new Error(
        getPasskeyPrfDiagnosticMessage(
          resolveCeremonyDiagnosticReason({ prfOutputPresent: false })
        )
      );
    }
    prfOutput = extractedPrf;

    const result = (await verifyVaultUnlockAuthentication(assertion)) as {
      verified: boolean;
      encryptedVaultKey: EncryptedPayload | null;
      prfRequired?: boolean;
    };

    if (!result.verified || !result.encryptedVaultKey) {
      throw new Error("This passkey is not linked to vault unlock.");
    }

    encryptedVaultKey = result.encryptedVaultKey;
    prfRequired = result.prfRequired ?? true;
  }

  const derivedKey = await unlockVaultFromPasskeyEnvelope(
    args.userId,
    encryptedVaultKey,
    prfOutput,
    { prfRequired, applySession: false }
  );

  if (!(await userVaultKeysEqual(args.sessionVaultKey, derivedKey))) {
    throw new Error(PASSKEY_VAULT_UNLOCK_TEST_MISMATCH_MESSAGE);
  }
}
