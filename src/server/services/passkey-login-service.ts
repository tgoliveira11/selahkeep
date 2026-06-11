import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { passkeyRepository } from "@/server/repositories/passkey-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { enforceRateLimit } from "@/server/policies/rate-limit";
import { passkeyPrfAuthExtensions, passkeyPrfExtensions } from "@/lib/passkey/prf";
import {
  getWebAuthnOrigins,
  getWebAuthnRpId,
  toPasskeyVerificationErrorMessage,
} from "@/lib/passkey/webauthn-config";
import { authLoginService } from "@/server/services/auth-login-service";
import { authService } from "@/server/services/auth-service";
import { twoFactorRepository } from "@/server/repositories/two-factor-repository";
import { hashOpaqueToken } from "@/server/policies/login-token";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";

const rpID = getWebAuthnRpId();
const origins = getWebAuthnOrigins();

async function resolveLoginCredentialAllowList(
  userId: string,
  preferredCredentialId?: string
): Promise<{ id: string; transports?: AuthenticatorTransport[] }[] | undefined> {
  const creds = await passkeyRepository.findByUserId(userId);
  const signInCreds = creds.filter((c) => c.signInEnabled);
  if (signInCreds.length === 0) return undefined;

  if (preferredCredentialId) {
    const preferred = signInCreds.find((c) => c.credentialId === preferredCredentialId);
    if (preferred) {
      return [
        {
          id: preferred.credentialId,
          transports: (preferred.transports as AuthenticatorTransport[]) ?? undefined,
        },
      ];
    }
  }

  return signInCreds.map((c) => ({
    id: c.credentialId,
    transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
  }));
}

async function resolveLoginContext(input?: {
  email?: string;
  userId?: string;
  credentialId?: string;
}): Promise<{
  userId?: string;
  allowCredentials?: { id: string; transports?: AuthenticatorTransport[] }[];
}> {
  if (input?.credentialId) {
    const credential = await passkeyRepository.findByCredentialId(input.credentialId);
    if (credential?.signInEnabled) {
      return {
        userId: credential.userId,
        allowCredentials: [
          {
            id: credential.credentialId,
            transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
          },
        ],
      };
    }
  }

  if (input?.userId) {
    const user = await userRepository.findById(input.userId);
    if (user) {
      return {
        userId: user.id,
        allowCredentials: await resolveLoginCredentialAllowList(user.id, input.credentialId),
      };
    }
  }

  if (input?.email) {
    const user = await userRepository.findByEmail(input.email);
    if (user) {
      return {
        userId: user.id,
        allowCredentials: await resolveLoginCredentialAllowList(user.id, input.credentialId),
      };
    }
  }

  return {};
}

export const passkeyLoginService = {
  async getLoginOptions(input?: {
    email?: string;
    userId?: string;
    credentialId?: string;
    ip?: string;
  }) {
    await enforceRateLimit({
      operation: "passkey.login",
      ip: input?.ip,
      endpoint: "/api/auth/passkey/login/options",
      keyMode: "ip",
    });

    const { userId, allowCredentials } = await resolveLoginContext(input);
    const credentialIds = allowCredentials?.map((credential) => credential.id);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: "required",
      extensions: userId ? passkeyPrfAuthExtensions(userId, credentialIds) : undefined,
    });

    await passkeyRepository.storeChallenge({
      userId,
      challenge: options.challenge,
      type: "login",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return { options, prfIncluded: Boolean(userId) };
  },

  async verifyLogin(response: AuthenticationResponseJSON, ip?: string) {
    const clientData = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString()
    );

    let challengeRecord;
    try {
      challengeRecord = await passkeyRepository.consumeValidChallenge(
        clientData.challenge,
        "login"
      );
    } catch {
      throw new ChallengeError("Invalid or expired challenge");
    }

    const credential = await passkeyRepository.findByCredentialId(response.id);
    if (!credential || !credential.signInEnabled) {
      await auditRepository.record("passkey_login_failed", challengeRecord.userId ?? undefined, {
        reason: "unknown_or_sign_in_disabled",
      });
      throw new NotFoundError("This passkey is not registered for sign-in.");
    }

    await enforceRateLimit({
      operation: "passkey.login",
      userId: credential.userId,
      ip,
      endpoint: "/api/auth/passkey/login/verify",
    });

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
      await auditRepository.record("passkey_login_failed", credential.userId, {
        reason: "verification_failed",
      });
      throw new ChallengeError(toPasskeyVerificationErrorMessage(error));
    }

    if (!verification.verified) {
      await auditRepository.record("passkey_login_failed", credential.userId, {
        reason: "not_verified",
      });
      throw new ChallengeError("Passkey sign-in failed. Try again.");
    }

    await passkeyRepository.updateCounter(
      credential.credentialId,
      String(verification.authenticationInfo.newCounter)
    );
    await passkeyRepository.updateLastUsedAt(credential.credentialId);

    const envelope = credential.vaultUnlockEnabled
      ? await vaultRepository.findActivePasskeyEnvelopeByCredentialId(
          credential.userId,
          credential.credentialId
        )
      : null;

    const loginToken = await authLoginService.issueLoginToken(credential.userId);
    await authService.recordLoginSuccess(credential.userId, "passkey");
    await auditRepository.record("passkey_login_success", credential.userId, {
      vaultUnlockAvailable: Boolean(envelope),
    });

    return {
      loginToken,
      userId: credential.userId,
      credentialId: credential.credentialId,
      vaultUnlockAvailable: Boolean(envelope),
      encryptedVaultKey: envelope?.encryptedVaultKey ?? null,
      prfRequired:
        (envelope?.publicMetadata as { prfRequired?: boolean } | null)?.prfRequired ?? true,
    };
  },

  async getLoginVaultUnlockOptions(
    loginToken: string,
    credentialId: string,
    ip?: string
  ) {
    const tokenRow = await twoFactorRepository.findValidLoginToken(hashOpaqueToken(loginToken));
    if (!tokenRow) {
      throw new ChallengeError("Login session expired. Sign in with your passkey again.");
    }

    const credential = await passkeyRepository.findByCredentialId(credentialId);
    if (
      !credential ||
      credential.userId !== tokenRow.userId ||
      !credential.signInEnabled ||
      !credential.vaultUnlockEnabled
    ) {
      throw new NotFoundError("This passkey cannot unlock your private letters.");
    }

    const envelope = await vaultRepository.findActivePasskeyEnvelopeByCredentialId(
      credential.userId,
      credential.credentialId
    );
    if (!envelope) {
      throw new NotFoundError("No vault envelope is available for this passkey.");
    }

    await enforceRateLimit({
      operation: "passkey.login",
      userId: credential.userId,
      ip,
      endpoint: "/api/auth/passkey/login/vault-unlock/options",
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
      extensions: passkeyPrfExtensions(credential.userId),
    });

    await passkeyRepository.storeChallenge({
      userId: credential.userId,
      challenge: options.challenge,
      type: "login_vault_unlock",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return {
      options,
      encryptedVaultKey: envelope.encryptedVaultKey,
      prfRequired:
        (envelope.publicMetadata as { prfRequired?: boolean } | null)?.prfRequired ?? true,
    };
  },
};
