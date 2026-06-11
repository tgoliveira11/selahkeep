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
import { enforceRateLimit } from "@/server/policies/rate-limit";
import { passkeyPrfExtensions } from "@/lib/passkey/prf";
import {
  getWebAuthnOrigins,
  getWebAuthnRpId,
  getWebAuthnRpName,
  toPasskeyVerificationErrorMessage,
} from "@/lib/passkey/webauthn-config";
import { assertVaultKeyAad } from "@/server/policies/aad-validation";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  getPasskeyCapabilityDisplay,
  getPasskeyCapabilityLabel,
} from "@/lib/passkey/credential-label";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";

const rpName = getWebAuthnRpName();
const rpID = getWebAuthnRpId();
const origins = getWebAuthnOrigins();

function defaultFriendlyName(deviceType?: string): string {
  if (deviceType === "singleDevice") return "This device";
  if (deviceType === "multiDevice") return "Synced passkey";
  return "Passkey";
}

export const passkeyAccountService = {
  async listPasskeys(userId: string) {
    const credentials = await passkeyRepository.findByUserId(userId);
    return credentials.map((cred) => {
      const label = getPasskeyCapabilityLabel({
        signInEnabled: cred.signInEnabled,
        vaultUnlockEnabled: cred.vaultUnlockEnabled,
      });
      return {
        id: cred.id,
        friendlyName: cred.friendlyName ?? defaultFriendlyName(),
        createdAt: cred.createdAt.toISOString(),
        lastUsedAt: cred.lastUsedAt?.toISOString() ?? null,
        signInEnabled: cred.signInEnabled,
        vaultUnlockEnabled: cred.vaultUnlockEnabled,
        prfSupported: cred.prfSupported,
        capability: label,
        capabilityLabel: getPasskeyCapabilityDisplay(label),
      };
    });
  },

  async getRegistrationOptions(userId: string, userName: string, ip?: string) {
    await enforceRateLimit({
      operation: "passkey.register",
      userId,
      ip,
      endpoint: "/api/account/passkeys/register/options",
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
    options?: {
      friendlyName?: string;
      encryptedVaultKey?: EncryptedPayload;
      prfVaultEnvelope?: boolean;
      prfSupported?: boolean | null;
    }
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

    const { credential, credentialDeviceType } = verification.registrationInfo;
    const wantsVaultEnvelope = Boolean(options?.encryptedVaultKey);

    if (wantsVaultEnvelope && !options?.prfVaultEnvelope) {
      throw new ChallengeError(
        "Passkey vault unlock requires PRF support. Use a recovery code or trusted device."
      );
    }

    if (options?.encryptedVaultKey) {
      assertVaultKeyAad(userId, options.encryptedVaultKey);
    }

    await runInTransaction(async (tx) => {
      await passkeyRepository.createCredential(
        {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: String(credential.counter),
          transports: credential.transports,
          friendlyName: options?.friendlyName ?? defaultFriendlyName(credentialDeviceType),
          signInEnabled: true,
          vaultUnlockEnabled: wantsVaultEnvelope,
          prfSupported: options?.prfSupported ?? (wantsVaultEnvelope ? true : null),
        },
        tx
      );

      if (options?.encryptedVaultKey && options.prfVaultEnvelope) {
        await vaultRepository.createEnvelope(
          {
            userId,
            method: "passkey_authorized_device",
            encryptedVaultKey: options.encryptedVaultKey,
            publicMetadata: { credentialId: credential.id, prfRequired: true },
          },
          tx
        );
      }

      await auditRepository.record("passkey_added", userId, { context: "account" }, tx);
    });

    return {
      verified: true,
      credentialId: credential.id,
      vaultUnlockEnabled: wantsVaultEnvelope,
    };
  },

  async getVaultUnlockAuthOptions(userId: string, credentialDbId: string, ip?: string) {
    const credential = await passkeyRepository.findByIdForUser(credentialDbId, userId);
    if (!credential) {
      throw new NotFoundError("Passkey not found");
    }
    if (credential.vaultUnlockEnabled) {
      throw new ChallengeError("This passkey already unlocks your private letters.");
    }

    await enforceRateLimit({
      operation: "passkey.authenticate",
      userId,
      ip,
      endpoint: "/api/account/passkeys/enable-vault-unlock",
    });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [
        {
          id: credential.credentialId,
          transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
        },
      ],
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
    options?: { prfVaultEnvelope?: boolean; prfSupported?: boolean | null }
  ) {
    if (!options?.prfVaultEnvelope) {
      throw new ChallengeError(
        "Passkey vault unlock requires PRF support. Use a recovery code or trusted device."
      );
    }

    assertVaultKeyAad(userId, encryptedVaultKey);

    const credential = await passkeyRepository.findByIdForUser(credentialDbId, userId);
    if (!credential) {
      throw new NotFoundError("Passkey not found");
    }
    if (credential.vaultUnlockEnabled) {
      throw new ChallengeError("This passkey already unlocks your private letters.");
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

      await auditRepository.record(
        "passkey_vault_unlock_enabled",
        userId,
        { credentialId: credential.credentialId },
        tx
      );
    });

    return { success: true };
  },

  async removePasskey(userId: string, credentialDbId: string) {
    const credential = await passkeyRepository.findByIdForUser(credentialDbId, userId);
    if (!credential) {
      throw new NotFoundError("Passkey not found");
    }

    await runInTransaction(async (tx) => {
      await passkeyRepository.revoke(credential.id, userId, tx);

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

      await auditRepository.record("passkey_removed", userId, { credentialId: credential.id }, tx);
    });

    return { success: true };
  },
};
