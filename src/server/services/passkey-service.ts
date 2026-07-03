import { runInTransaction } from "@/lib/db/transaction";
import { createHash } from "node:crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { passkeyRepository } from "@/server/repositories/passkey-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import { enforceRateLimit, RateLimitError } from "@/server/policies/rate-limit";
import { passkeyPrfExtensions } from "@/lib/passkey/prf";
import {
  toAllowCredentialDescriptor,
  toVaultUnlockAllowCredentialDescriptor,
  persistRegistrationTransports,
  vaultRegistrationExcludeCredentials,
} from "@/lib/passkey/passkey-transports";
import {
  PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE,
  PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE,
  PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE,
} from "@/lib/passkey/messages";
import {
  getWebAuthnOrigins,
  getWebAuthnRpId,
  getWebAuthnRpName,
  toPasskeyVerificationErrorMessage,
} from "@/lib/passkey/webauthn-config";
import { assertVaultKeyAad } from "@/server/policies/aad-validation";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

const rpName = getWebAuthnRpName();
const rpID = getWebAuthnRpId();
const origins = getWebAuthnOrigins();

export type PasskeyAuthenticatePurpose = "vault_unlock";

type PasskeyAuthenticationOptions = {
  purpose?: PasskeyAuthenticatePurpose;
};

type PasskeyRegistrationOptions = {
  vaultOnly?: boolean;
};

/** Apple overwrites a passkey registered with the same RP ID + user handle. */
export function vaultPasskeyUserHandle(userId: string): Uint8Array<ArrayBuffer> {
  const digest = createHash("sha256")
    .update(`selahkeep:vault-passkey:${userId}`)
    .digest();
  const userHandle = new Uint8Array(new ArrayBuffer(digest.byteLength));
  userHandle.set(digest);
  return userHandle;
}

/**
 * Builds vault-unlock authentication options scoped to the active passkey envelope's
 * credential only. The active `passkey_authorized_device` envelope is the source of
 * truth for which credential can unlock the vault; its `publicMetadata.credentialId`
 * selects the single `allowCredentials` entry.
 */
async function buildVaultUnlockAuthenticationOptions(userId?: string) {
  if (!userId) {
    throw new ChallengeError(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE);
  }

  const envelope = await vaultRepository.findActiveEnvelopeByMethod(
    userId,
    "passkey_authorized_device"
  );
  const envelopeCredentialId = (
    envelope?.publicMetadata as { credentialId?: string } | null
  )?.credentialId;

  if (!envelope || !envelopeCredentialId) {
    throw new ChallengeError(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE);
  }

  const credentials = await passkeyRepository.findByUserId(userId);
  const activeCredential = credentials.find(
    (credential) =>
      credential.credentialId === envelopeCredentialId && credential.vaultUnlockEnabled
  );

  if (!activeCredential) {
    throw new ChallengeError(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE);
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [toVaultUnlockAllowCredentialDescriptor(activeCredential)],
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
}

export const passkeyService = {
  async getRegistrationOptions(
    userId: string,
    userName: string,
    ip?: string,
    regOptions?: PasskeyRegistrationOptions
  ) {
    await enforceRateLimit({
      operation: "passkey.register",
      userId,
      ip,
      endpoint: "/api/passkeys/register",
    });

    const existing = await passkeyRepository.findByUserId(userId);
    const vaultOnly = Boolean(regOptions?.vaultOnly);
    const excludeCredentials = vaultOnly
      ? vaultRegistrationExcludeCredentials(existing)
      : existing.map((credential) => toAllowCredentialDescriptor(credential));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: vaultOnly ? `${userName} · SelahKeep vault` : userName,
      userID: vaultOnly
        ? vaultPasskeyUserHandle(userId)
        : new TextEncoder().encode(userId),
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: vaultOnly
        ? {
            authenticatorAttachment: "platform",
            residentKey: "preferred",
            userVerification: "required",
          }
        : {
            residentKey: "preferred",
            userVerification: "preferred",
          },
      extensions: passkeyPrfExtensions(userId),
    });

    await passkeyRepository.storeChallenge({
      userId,
      challenge: options.challenge,
      type: "registration",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return options;
  },

  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    encryptedVaultKey?: EncryptedPayload,
    options?: { prfVaultEnvelope?: boolean; vaultOnly?: boolean }
  ) {
    const clientData = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString()
    );

    let challengeRecord;
    try {
      challengeRecord = await passkeyRepository.consumeValidChallenge(
        clientData.challenge,
        "registration",
        userId
      );
    } catch {
      throw new ChallengeError("Invalid or expired challenge");
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Passkey registration failed");
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const wantsVaultEnvelope = Boolean(encryptedVaultKey);
    if (wantsVaultEnvelope && !options?.prfVaultEnvelope) {
      throw new ChallengeError(
        "Passkey vault unlock requires PRF support. Use your vault password or recovery phrase."
      );
    }

    if (encryptedVaultKey) {
      assertVaultKeyAad(userId, encryptedVaultKey);
    }

    // Vault-only passkeys may register WITHOUT an envelope: the canonical flow
    // registers the credential first, then creates the envelope from an
    // authentication-ceremony PRF (POST /api/account/passkeys/:id/enable-vault-unlock),
    // so the wrap PRF matches the unlock `get` ceremony. Registration-PRF wrapping
    // is unreliable on iOS (create vs get can differ).
    const vaultOnly = Boolean(options?.vaultOnly);

    let createdCredentialDbId = "";
    await runInTransaction(async (tx) => {
      const createdCredential = await passkeyRepository.createCredential(
        {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: String(credential.counter),
          transports: persistRegistrationTransports(credential.transports),
          friendlyName: vaultOnly ? "Vault passkey" : null,
          signInEnabled: vaultOnly ? false : true,
          vaultUnlockEnabled: Boolean(encryptedVaultKey && options?.prfVaultEnvelope),
          prfSupported: encryptedVaultKey && options?.prfVaultEnvelope ? true : null,
        },
        tx
      );
      createdCredentialDbId = createdCredential.id;

      if (encryptedVaultKey && options?.prfVaultEnvelope) {
        await vaultRepository.createEnvelope(
          {
            userId,
            method: "passkey_authorized_device",
            encryptedVaultKey,
            publicMetadata: { credentialId: credential.id, prfRequired: true },
          },
          tx
        );
      }

      await auditRepository.record("passkey_added", userId, undefined, tx);
    });

    return {
      verified: true,
      credentialId: credential.id,
      credentialDbId: createdCredentialDbId,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    };
  },

  async getAuthenticationOptions(
    userId?: string,
    ip?: string,
    authOptions?: PasskeyAuthenticationOptions
  ) {
    await enforceRateLimit({
      operation: "passkey.authenticate",
      userId,
      ip,
      endpoint: "/api/passkeys/authenticate",
    });

    const purpose = authOptions?.purpose;

    // Vault unlock follows the vault-core canonical contract: scope the ceremony to
    // the single credential bound to the active passkey envelope, request PRF `eval`
    // (never evalByCredential), and pin `internal` transport. This keeps the PRF
    // output identical to setup/enable and avoids iOS hybrid routing.
    if (purpose === "vault_unlock") {
      return buildVaultUnlockAuthenticationOptions(userId);
    }

    const credentials = userId ? await passkeyRepository.findByUserId(userId) : [];
    const allowCredentials =
      userId && credentials.length > 0
        ? credentials.map((credential) => toAllowCredentialDescriptor(credential))
        : undefined;
    const extensions = userId ? passkeyPrfExtensions(userId) : undefined;

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: "preferred",
      extensions,
    });

    await passkeyRepository.storeChallenge({
      userId,
      challenge: options.challenge,
      type: "authentication",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return options;
  },

  async verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
    authOptions?: PasskeyAuthenticationOptions
  ) {
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

    const credential = await passkeyRepository.findByCredentialId(response.id);
    if (!credential || credential.userId !== userId) {
      await auditRepository.record("failed_unlock_attempt", userId, { method: "passkey" });
      throw new NotFoundError(
        "This passkey is not registered for your account. Set up your passkey again from Recovery while your vault is unlocked."
      );
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
      await auditRepository.record("failed_unlock_attempt", userId, { method: "passkey" });
      throw new ChallengeError(toPasskeyVerificationErrorMessage(error));
    }

    if (!verification.verified) {
      await auditRepository.record("failed_unlock_attempt", userId, { method: "passkey" });
      throw new ChallengeError("Passkey authentication failed. Try again or use your recovery code.");
    }

    await passkeyRepository.updateCounter(
      credential.credentialId,
      String(verification.authenticationInfo.newCounter)
    );

    await passkeyRepository.updateLastUsedAt(credential.credentialId);

    const purpose = authOptions?.purpose;

    if (purpose === "vault_unlock") {
      if (!credential.vaultUnlockEnabled) {
        await auditRepository.record("failed_unlock_attempt", userId, { method: "passkey" });
        throw new ChallengeError(PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE);
      }

      const envelope = await vaultRepository.findActivePasskeyEnvelopeByCredentialId(
        userId,
        credential.credentialId
      );

      if (!envelope?.encryptedVaultKey) {
        await auditRepository.record("failed_unlock_attempt", userId, { method: "passkey" });
        throw new ChallengeError(PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE);
      }

      return {
        verified: true,
        encryptedVaultKey: envelope.encryptedVaultKey,
        prfRequired:
          (envelope.publicMetadata as { prfRequired?: boolean } | null)?.prfRequired ?? true,
      };
    }

    const envelope = credential.vaultUnlockEnabled
      ? await vaultRepository.findActivePasskeyEnvelopeByCredentialId(
          userId,
          credential.credentialId
        )
      : null;

    return {
      verified: true,
      encryptedVaultKey: envelope?.encryptedVaultKey ?? null,
      prfRequired:
        (envelope?.publicMetadata as { prfRequired?: boolean } | null)?.prfRequired ?? true,
    };
  },

  async listVaultUnlockCredentials(userId: string) {
    const credentials = await passkeyRepository.findByUserId(userId);
    const envelope = await vaultRepository.findActiveEnvelopeByMethod(
      userId,
      "passkey_authorized_device"
    );

    const vaultCredentials = credentials.filter((credential) => credential.vaultUnlockEnabled);

    if (vaultCredentials.length === 0 && envelope) {
      return {
        passkeys: [] as Array<{
          id: string;
          friendlyName: string;
          signInEnabled: boolean;
          vaultUnlockEnabled: boolean;
          prfSupported: boolean | null;
          credentialId: string;
        }>,
        serverEnvelopeConfigured: true,
      };
    }

    return {
      passkeys: vaultCredentials.map((credential) => ({
        id: credential.id,
        friendlyName: credential.friendlyName ?? "Vault passkey",
        signInEnabled: credential.signInEnabled,
        vaultUnlockEnabled: credential.vaultUnlockEnabled,
        prfSupported: credential.prfSupported,
        credentialId: credential.credentialId,
      })),
      serverEnvelopeConfigured: Boolean(envelope),
    };
  },

  async removeAll(userId: string) {
    const credentials = await passkeyRepository.findByUserId(userId);
    const envelope = await vaultRepository.findActiveEnvelopeByMethod(
      userId,
      "passkey_authorized_device"
    );

    if (credentials.length === 0 && !envelope) {
      throw new NotFoundError("No passkey configured");
    }

    await runInTransaction(async (tx) => {
      await passkeyRepository.revokeAllByUserId(userId, tx);

      const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
      for (const item of envelopes) {
        if (item.method === "passkey_authorized_device") {
          await vaultRepository.revokeEnvelope(item.id, userId, tx);
        }
      }

      await auditRepository.record("passkey_removed", userId, undefined, tx);
    });

    return { success: true };
  },
};

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ChallengeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChallengeError";
  }
}

export { RateLimitError };
