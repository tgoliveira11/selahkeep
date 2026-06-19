import { runInTransaction } from "@/lib/db/transaction";
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

export const passkeyService = {
  async getRegistrationOptions(userId: string, userName: string, ip?: string) {
    await enforceRateLimit({
      operation: "passkey.register",
      userId,
      ip,
      endpoint: "/api/passkeys/register",
    });

    const existing = await passkeyRepository.findByUserId(userId);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName,
      userID: new TextEncoder().encode(userId),
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
      })),
      authenticatorSelection: {
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

    const vaultOnly = Boolean(options?.vaultOnly);
    if (vaultOnly && !wantsVaultEnvelope) {
      throw new ChallengeError("Vault-only passkeys require a PRF vault envelope.");
    }

    await runInTransaction(async (tx) => {
      await passkeyRepository.createCredential(
        {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: String(credential.counter),
          transports: credential.transports,
          friendlyName: vaultOnly ? "Vault passkey" : null,
          signInEnabled: vaultOnly ? false : true,
          vaultUnlockEnabled: Boolean(encryptedVaultKey && options?.prfVaultEnvelope),
          prfSupported: encryptedVaultKey && options?.prfVaultEnvelope ? true : null,
        },
        tx
      );

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
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    };
  },

  async getAuthenticationOptions(userId?: string, ip?: string) {
    await enforceRateLimit({
      operation: "passkey.authenticate",
      userId,
      ip,
      endpoint: "/api/passkeys/authenticate",
    });

    let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] | undefined;
    if (userId) {
      const creds = await passkeyRepository.findByUserId(userId);
      if (creds.length > 0) {
        allowCredentials = creds.map((c) => ({
          id: c.credentialId,
          transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: "preferred",
      extensions: userId ? passkeyPrfExtensions(userId) : undefined,
    });

    await passkeyRepository.storeChallenge({
      userId,
      challenge: options.challenge,
      type: "authentication",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return options;
  },

  async verifyAuthentication(userId: string, response: AuthenticationResponseJSON) {
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
