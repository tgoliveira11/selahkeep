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
import { assertVaultKeyAad } from "@/server/policies/aad-validation";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

const rpName = process.env.WEBAUTHN_RP_NAME ?? "Letters to God";
const rpID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const origin = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3001";

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
    encryptedVaultKey?: EncryptedPayload
  ) {
    let storedChallenge: string | null = null;
    const clientData = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString()
    );
    const challengeRecord = await passkeyRepository.findValidChallenge(
      clientData.challenge,
      "registration",
      userId
    );
    if (challengeRecord) {
      storedChallenge = challengeRecord.challenge;
      await passkeyRepository.deleteChallenge(challengeRecord.id);
    }

    if (!storedChallenge) throw new ChallengeError("Invalid or expired challenge");

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: storedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Passkey registration failed");
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    if (encryptedVaultKey) {
      assertVaultKeyAad(userId, encryptedVaultKey);
    }

    await runInTransaction(async (tx) => {
      await passkeyRepository.createCredential(
        {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: String(credential.counter),
          transports: credential.transports,
        },
        tx
      );

      if (encryptedVaultKey) {
        const existingEnvelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
        for (const envelope of existingEnvelopes) {
          if (envelope.method === "passkey_authorized_device") {
            await vaultRepository.revokeEnvelope(envelope.id, userId, tx);
          }
        }

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
      allowCredentials = creds.map((c) => ({
        id: c.credentialId,
        transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
      }));
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
    const challengeRecord = await passkeyRepository.findValidChallenge(
      clientData.challenge,
      "authentication",
      userId
    );
    if (!challengeRecord) throw new ChallengeError("Invalid or expired challenge");
    await passkeyRepository.deleteChallenge(challengeRecord.id);

    const credential = await passkeyRepository.findByCredentialId(response.id);
    if (!credential || credential.userId !== userId) {
      await auditRepository.record("failed_unlock_attempt", userId, { method: "passkey" });
      throw new Error("Credential not found");
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: parseInt(credential.counter, 10),
        transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
      },
    });

    if (!verification.verified) {
      await auditRepository.record("failed_unlock_attempt", userId, { method: "passkey" });
      throw new Error("Passkey authentication failed");
    }

    await passkeyRepository.updateCounter(
      credential.credentialId,
      String(verification.authenticationInfo.newCounter)
    );

    const envelope = await vaultRepository.findActiveEnvelopeByMethod(
      userId,
      "passkey_authorized_device"
    );

    return {
      verified: true,
      encryptedVaultKey: envelope?.encryptedVaultKey ?? null,
      prfRequired:
        (envelope?.publicMetadata as { prfRequired?: boolean } | null)?.prfRequired ?? true,
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
