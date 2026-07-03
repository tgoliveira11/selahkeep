import { runInTransaction } from "@/lib/db/transaction";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { passkeyRepository } from "@/server/repositories/passkey-repository";
import { vaultPasskeyDeviceBindingRepository } from "@/server/repositories/vault-passkey-device-binding-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import { enforceRateLimit } from "@/server/policies/rate-limit";
import { passkeyPrfExtensions } from "@/lib/passkey/prf";
import {
  getWebAuthnOrigins,
  getWebAuthnRpId,
  toPasskeyVerificationErrorMessage,
} from "@/lib/passkey/webauthn-config";
import { assertVaultKeyAad } from "@/server/policies/aad-validation";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";

const rpID = getWebAuthnRpId();
const origins = getWebAuthnOrigins();

function assertPrfInAuthenticationResponse(response: AuthenticationResponseJSON): void {
  const extensions = response.clientExtensionResults as
    | { prf?: { results?: { first?: unknown } } }
    | undefined;
  if (!extensions?.prf?.results?.first) {
    throw new ChallengeError(
      "PRF output is required to manage passkey vault unlock from this browser."
    );
  }
}

async function verifyPasskeyAuthentication(
  userId: string,
  credentialDbId: string,
  response: AuthenticationResponseJSON
) {
  const credential = await passkeyRepository.findByIdForUser(credentialDbId, userId);
  if (!credential) {
    throw new NotFoundError("Passkey not found");
  }

  const clientData = JSON.parse(
    Buffer.from(response.response.clientDataJSON, "base64url").toString()
  );

  let challengeRecord;
  try {
    challengeRecord = await passkeyRepository.consumeValidChallenge(
      clientData.challenge,
      "authentication",
      userId
    );
  } catch {
    throw new ChallengeError("Invalid or expired challenge");
  }

  if (response.id !== credential.credentialId) {
    throw new ChallengeError("Passkey mismatch. Try again with the selected passkey.");
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
        counter: Number.parseInt(credential.counter, 10) || 0,
        transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
      },
    });
  } catch (error) {
    throw new ChallengeError(toPasskeyVerificationErrorMessage(error));
  }

  if (!verification.verified) {
    throw new ChallengeError("Passkey verification failed. Try again.");
  }

  assertPrfInAuthenticationResponse(response);

  return { credential, verification };
}

/** Product-only: enable vault unlock on an account passkey registered via @tgoliveira/secure-auth. */
export const passkeyVaultEnvelopeService = {
  async getVaultUnlockAuthOptions(userId: string, credentialDbId: string, ip?: string) {
    const credential = await passkeyRepository.findByIdForUser(credentialDbId, userId);
    if (!credential) {
      throw new NotFoundError("Passkey not found");
    }
    if (credential.vaultUnlockEnabled) {
      throw new ChallengeError("This passkey already unlocks your vault.");
    }

    await enforceRateLimit({
      operation: "passkey.authenticate",
      userId,
      ip,
      endpoint: "/api/account/passkeys/enable-vault-unlock",
    });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{ id: credential.credentialId, transports: ["internal"] }],
      userVerification: "required",
      extensions: passkeyPrfExtensions(userId),
    });

    await passkeyRepository.storeChallenge({
      userId,
      challenge: options.challenge,
      type: "authentication",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return options;
  },

  async enableVaultUnlock(
    userId: string,
    credentialDbId: string,
    response: AuthenticationResponseJSON,
    encryptedVaultKey: EncryptedPayload,
    options?: {
      prfVaultEnvelope?: boolean;
      prfSupported?: boolean | null;
      deviceLabel?: string | null;
      existingDeviceBindingId?: string;
    }
  ) {
    if (!options?.prfVaultEnvelope) {
      throw new ChallengeError(
        "Passkey vault unlock requires PRF support. Use your vault password or recovery phrase."
      );
    }

    assertVaultKeyAad(userId, encryptedVaultKey);

    const credential = await passkeyRepository.findByIdForUser(credentialDbId, userId);
    if (!credential) {
      throw new NotFoundError("Passkey not found");
    }
    if (credential.vaultUnlockEnabled) {
      throw new ChallengeError("This passkey already unlocks your vault.");
    }

    const clientData = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString()
    );

    let challengeRecord;
    try {
      challengeRecord = await passkeyRepository.consumeValidChallenge(
        clientData.challenge,
        "authentication",
        userId
      );
    } catch {
      throw new ChallengeError("Invalid or expired challenge");
    }

    if (response.id !== credential.credentialId) {
      throw new ChallengeError("Passkey mismatch. Try again with the selected passkey.");
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
          counter: Number.parseInt(credential.counter, 10) || 0,
          transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
        },
      });
    } catch (error) {
      throw new ChallengeError(toPasskeyVerificationErrorMessage(error));
    }

    if (!verification.verified) {
      throw new ChallengeError("Passkey verification failed. Try again.");
    }

    assertPrfInAuthenticationResponse(response);

    let deviceBindingId: string | undefined;

    await runInTransaction(async (tx) => {
      await passkeyRepository.updateCounter(
        credential.credentialId,
        String(verification.authenticationInfo.newCounter),
        tx
      );

      const existingEnvelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
      for (const envelope of existingEnvelopes) {
        const metadata = envelope.publicMetadata as { credentialId?: string } | null;
        if (
          envelope.method === "passkey_authorized_device" &&
          metadata?.credentialId === credential.credentialId
        ) {
          await vaultRepository.revokeEnvelope(envelope.id, userId, tx);
        }
      }

      await vaultRepository.createEnvelope(
        {
          userId,
          method: "passkey_authorized_device",
          encryptedVaultKey,
          publicMetadata: { credentialId: credential.credentialId, prfRequired: true },
        },
        tx
      );

      await passkeyRepository.updateCredentialFlags(
        credential.id,
        userId,
        {
          vaultUnlockEnabled: true,
          prfSupported: options.prfSupported ?? true,
        },
        tx
      );

      const binding = await vaultPasskeyDeviceBindingRepository.bindPasskeyToDevice(
        userId,
        credential.id,
        {
          deviceLabel: options?.deviceLabel ?? credential.friendlyName,
          existingBindingId: options?.existingDeviceBindingId,
        },
        tx
      );
      deviceBindingId = binding.bindingId;

      await auditRepository.record(
        "passkey_vault_unlock_enabled",
        userId,
        { credentialId: credential.credentialId },
        tx
      );
    });

    return { success: true, deviceBindingId };
  },

  async getVaultUnlockStatus(userId: string, credentialDbId: string) {
    const credential = await passkeyRepository.findByIdForUser(credentialDbId, userId);
    if (!credential) {
      throw new NotFoundError("Passkey not found");
    }

    const envelope = credential.vaultUnlockEnabled
      ? await vaultRepository.findActivePasskeyEnvelopeByCredentialId(
          userId,
          credential.credentialId
        )
      : null;

    return {
      signInEnabled: credential.signInEnabled,
      vaultUnlockEnabled: Boolean(credential.vaultUnlockEnabled && envelope),
      prfSupported: credential.prfSupported,
      credentialId: credential.credentialId,
    };
  },

  async getManageVaultUnlockAuthOptions(userId: string, credentialDbId: string, ip?: string) {
    const credential = await passkeyRepository.findByIdForUser(credentialDbId, userId);
    if (!credential) {
      throw new NotFoundError("Passkey not found");
    }
    if (!credential.vaultUnlockEnabled) {
      throw new ChallengeError("Passkey vault unlock is not enabled for this passkey.");
    }

    await enforceRateLimit({
      operation: "passkey.authenticate",
      userId,
      ip,
      endpoint: "/api/account/passkeys/vault-unlock-manage",
    });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{ id: credential.credentialId, transports: ["internal"] }],
      userVerification: "required",
      extensions: passkeyPrfExtensions(userId),
    });

    await passkeyRepository.storeChallenge({
      userId,
      challenge: options.challenge,
      type: "authentication",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return options;
  },

  async disableVaultUnlockWithProof(
    userId: string,
    credentialDbId: string,
    response: AuthenticationResponseJSON
  ) {
    const { credential } = await verifyPasskeyAuthentication(userId, credentialDbId, response);

    if (!credential.vaultUnlockEnabled) {
      throw new ChallengeError("Passkey vault unlock is not enabled for this passkey.");
    }

    let removedBindingId: string | null = null;

    await runInTransaction(async (tx) => {
      const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
      for (const envelope of envelopes) {
        const metadata = envelope.publicMetadata as { credentialId?: string } | null;
        if (
          envelope.method === "passkey_authorized_device" &&
          metadata?.credentialId === credential.credentialId
        ) {
          await vaultRepository.revokeEnvelope(envelope.id, userId, tx);
        }
      }

      removedBindingId = await vaultPasskeyDeviceBindingRepository.deleteByPasskeyCredentialId(
        credential.id,
        userId,
        tx
      );

      if (!credential.signInEnabled) {
        await passkeyRepository.revoke(credential.id, userId, tx);
        await auditRepository.record("passkey_removed", userId, undefined, tx);
      } else {
        await passkeyRepository.updateCredentialFlags(
          credential.id,
          userId,
          { vaultUnlockEnabled: false },
          tx
        );
      }

      await auditRepository.record(
        "passkey_vault_unlock_disabled",
        userId,
        { credentialId: credential.credentialId },
        tx
      );
    });

    return { success: true, removedBindingId };
  },
};
