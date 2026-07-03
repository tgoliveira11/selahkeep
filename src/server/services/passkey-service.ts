import { runInTransaction } from "@/lib/db/transaction";
import { randomBytes } from "node:crypto";
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
import { vaultPasskeyDeviceBindingRepository } from "@/server/repositories/vault-passkey-device-binding-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import {
  resolvePasskeyUnlockAvailableOnThisDevice,
  touchVaultPasskeyDeviceBindingLastUsed,
} from "@/server/services/vault-passkey-device-binding-service";
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
  deviceBindingId?: string;
};

type PasskeyRegistrationOptions = {
  vaultOnly?: boolean;
};

/**
 * Random per-registration WebAuthn user handle for vault-only passkeys. Distinct
 * handles let multiple vault passkeys (one per device) coexist without a synced
 * provider overwriting one another, and stay separate from the account passkey handle
 * (the userId) so adding an account passkey never replaces a vault passkey.
 */
export function vaultPasskeyUserHandle(): Uint8Array<ArrayBuffer> {
  const handle = new Uint8Array(new ArrayBuffer(32));
  handle.set(randomBytes(32));
  return handle;
}

/**
 * Builds vault-unlock authentication options for passkey envelope credentials.
 *
 * When `deviceBindingId` is present (HttpOnly cookie), scopes `allowCredentials` to the
 * single credential bound to this browser so multi-device accounts skip the passkey picker.
 * Without a binding, offers every active vault passkey (legacy / first unlock on a browser).
 */
async function buildVaultUnlockAuthenticationOptions(
  userId?: string,
  deviceBindingId?: string
) {
  if (!userId) {
    throw new ChallengeError(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE);
  }

  const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
  const envelopeCredentialIds = new Set(
    envelopes
      .filter((envelope) => envelope.method === "passkey_authorized_device")
      .map((envelope) => (envelope.publicMetadata as { credentialId?: string } | null)?.credentialId)
      .filter((credentialId): credentialId is string => Boolean(credentialId))
  );

  if (envelopeCredentialIds.size === 0) {
    throw new ChallengeError(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE);
  }

  const credentials = await passkeyRepository.findByUserId(userId);
  let activeCredentials = credentials.filter(
    (credential) =>
      credential.vaultUnlockEnabled && envelopeCredentialIds.has(credential.credentialId)
  );

  if (deviceBindingId) {
    const binding = await vaultPasskeyDeviceBindingRepository.findByIdForUser(
      deviceBindingId,
      userId
    );
    if (binding) {
      const boundCredential = activeCredentials.find(
        (credential) => credential.id === binding.passkeyCredentialId
      );
      if (boundCredential) {
        activeCredentials = [boundCredential];
      }
    }
  }

  if (activeCredentials.length === 0) {
    throw new ChallengeError(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE);
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: activeCredentials.map((credential) =>
      toVaultUnlockAllowCredentialDescriptor(credential)
    ),
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
        ? vaultPasskeyUserHandle()
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
    options?: {
      prfVaultEnvelope?: boolean;
      vaultOnly?: boolean;
      friendlyName?: string;
      existingDeviceBindingId?: string;
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
    let deviceBindingId: string | undefined;
    await runInTransaction(async (tx) => {
      const createdCredential = await passkeyRepository.createCredential(
        {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: String(credential.counter),
          transports: persistRegistrationTransports(credential.transports),
          friendlyName: vaultOnly
            ? options?.friendlyName?.trim()
              ? `Vault passkey · ${options.friendlyName.trim().slice(0, 40)}`
              : "Vault passkey"
            : null,
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

        const binding = await vaultPasskeyDeviceBindingRepository.bindPasskeyToDevice(
          userId,
          createdCredential.id,
          {
            deviceLabel: options?.friendlyName ?? createdCredential.friendlyName,
            existingBindingId: options?.existingDeviceBindingId,
          },
          tx
        );
        deviceBindingId = binding.bindingId;
      }

      await auditRepository.record("passkey_added", userId, undefined, tx);
    });

    return {
      verified: true,
      credentialId: credential.id,
      credentialDbId: createdCredentialDbId,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      deviceBindingId,
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
      return buildVaultUnlockAuthenticationOptions(userId, authOptions?.deviceBindingId);
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

      if (authOptions?.deviceBindingId) {
        await touchVaultPasskeyDeviceBindingLastUsed(userId, authOptions.deviceBindingId);
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

  async listVaultUnlockCredentials(userId: string, deviceBindingId?: string) {
    const credentials = await passkeyRepository.findByUserId(userId);
    const envelope = await vaultRepository.findActiveEnvelopeByMethod(
      userId,
      "passkey_authorized_device"
    );
    const deviceBindings = await vaultPasskeyDeviceBindingRepository.listByUserId(userId);

    const vaultCredentials = credentials.filter((credential) => credential.vaultUnlockEnabled);

    const currentBinding = deviceBindingId
      ? deviceBindings.find((binding) => binding.id === deviceBindingId)
      : undefined;
    const currentDeviceCredentialId = currentBinding?.credentialId;
    const passkeyUnlockAvailableOnThisDevice = await resolvePasskeyUnlockAvailableOnThisDevice(
      userId,
      deviceBindingId
    );

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
        deviceBindings: deviceBindings.map((binding) => ({
          id: binding.id,
          credentialId: binding.credentialId,
          deviceLabel: binding.deviceLabel ?? binding.friendlyName ?? "Vault passkey",
          createdAt: binding.createdAt.toISOString(),
          lastUsedAt: binding.lastUsedAt?.toISOString() ?? null,
          isCurrentDevice: binding.id === deviceBindingId,
        })),
        currentDeviceCredentialId,
        passkeyUnlockAvailableOnThisDevice,
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
      deviceBindings: deviceBindings.map((binding) => ({
        id: binding.id,
        credentialId: binding.credentialId,
        deviceLabel: binding.deviceLabel ?? binding.friendlyName ?? "Vault passkey",
        createdAt: binding.createdAt.toISOString(),
        lastUsedAt: binding.lastUsedAt?.toISOString() ?? null,
        isCurrentDevice: binding.id === deviceBindingId,
      })),
      currentDeviceCredentialId,
      passkeyUnlockAvailableOnThisDevice,
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

      await vaultPasskeyDeviceBindingRepository.deleteAllByUserId(userId, tx);

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
