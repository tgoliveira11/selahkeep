import {
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { passkeyRepository } from "@/server/repositories/passkey-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { enforceRateLimit } from "@/server/policies/rate-limit";
import { passkeyPrfAuthExtensions, passkeyPrfExtensions } from "@/lib/passkey/prf";
import { getWebAuthnOrigins, getWebAuthnRpId } from "@/lib/passkey/webauthn-config";
import { loginTokenRepository } from "@/server/repositories/login-token-repository";
import { hashOpaqueToken } from "@/server/policies/login-token";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";

const rpID = getWebAuthnRpId();
const origins = getWebAuthnOrigins();

export function optionsIncludePrf(options: unknown): boolean {
  if (!options || typeof options !== "object") return false;
  const extensions = (options as { extensions?: unknown }).extensions;
  if (!extensions || typeof extensions !== "object") return false;
  return "prf" in extensions && (extensions as { prf?: unknown }).prf != null;
}

type PasskeyLoginOptionsInput = {
  email?: string;
  userId?: string;
  credentialId?: string;
};

async function getSignInCredentialIds(
  userId: string,
  preferredCredentialId?: string
): Promise<string[]> {
  const creds = await passkeyRepository.findByUserId(userId);
  const signInCreds = creds.filter((credential) => credential.signInEnabled);
  if (signInCreds.length === 0) return [];

  if (preferredCredentialId) {
    const preferred = signInCreds.find(
      (credential) => credential.credentialId === preferredCredentialId
    );
    if (preferred) return [preferred.credentialId];
  }

  return signInCreds.map((credential) => credential.credentialId);
}

async function getVaultUnlockMetadataForCredential(userId: string, credentialId: string) {
  const credential = await passkeyRepository.findByCredentialId(credentialId);
  if (
    !credential ||
    credential.userId !== userId ||
    !credential.signInEnabled ||
    !credential.vaultUnlockEnabled
  ) {
    return {
      vaultUnlockAvailable: false,
      encryptedVaultKey: null,
      prfRequired: true,
    };
  }

  const envelope = await vaultRepository.findActivePasskeyEnvelopeByCredentialId(
    userId,
    credential.credentialId
  );
  if (!envelope) {
    return {
      vaultUnlockAvailable: false,
      encryptedVaultKey: null,
      prfRequired: true,
    };
  }

  return {
    vaultUnlockAvailable: true,
    encryptedVaultKey: envelope.encryptedVaultKey,
    prfRequired:
      (envelope.publicMetadata as { prfRequired?: boolean } | null)?.prfRequired ?? true,
  };
}

async function resolveVaultPrfLoginContext(input: PasskeyLoginOptionsInput) {
  let userId: string | undefined;
  let candidateCredentialIds: string[] = [];

  if (input.credentialId) {
    const credential = await passkeyRepository.findByCredentialId(input.credentialId);
    if (credential?.signInEnabled) {
      userId = credential.userId;
      candidateCredentialIds = [credential.credentialId];
    }
  }

  if (!userId && input.userId) {
    userId = input.userId;
    candidateCredentialIds = await getSignInCredentialIds(userId, input.credentialId);
  }

  if (!userId && input.email) {
    const user = await userRepository.findByEmail(input.email);
    if (user) {
      userId = user.id;
      candidateCredentialIds = await getSignInCredentialIds(user.id, input.credentialId);
    }
  }

  if (!userId || candidateCredentialIds.length === 0) return null;

  const vaultUnlockCredentialIds: string[] = [];
  for (const credentialId of candidateCredentialIds) {
    const metadata = await getVaultUnlockMetadataForCredential(userId, credentialId);
    if (metadata.vaultUnlockAvailable) {
      vaultUnlockCredentialIds.push(credentialId);
    }
  }

  if (vaultUnlockCredentialIds.length === 0) return null;
  return { userId, vaultUnlockCredentialIds };
}

/** Vault-only passkey helpers; account sign-in passkeys are handled by @tgoliveira/secure-auth. */
export const passkeyLoginVaultService = {
  async enrichLoginOptionsWithVaultPrf(
    input: PasskeyLoginOptionsInput,
    options: PublicKeyCredentialRequestOptionsJSON
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const context = await resolveVaultPrfLoginContext(input);
    if (!context) return options;

    const prfExtensions =
      context.vaultUnlockCredentialIds.length > 1
        ? passkeyPrfAuthExtensions(context.userId, context.vaultUnlockCredentialIds)
        : passkeyPrfExtensions(context.userId);

    return {
      ...options,
      extensions: {
        ...(options.extensions ?? {}),
        ...prfExtensions,
      },
    };
  },

  async getVaultUnlockMetadataForCredential(userId: string, credentialId: string) {
    return getVaultUnlockMetadataForCredential(userId, credentialId);
  },

  async getVaultUnlockMetadataForLogin(loginToken: string, credentialId: string) {
    const tokenRow = await loginTokenRepository.findValidLoginToken(hashOpaqueToken(loginToken));
    if (!tokenRow) {
      throw new ChallengeError("Login session expired. Sign in with your passkey again.");
    }

    return getVaultUnlockMetadataForCredential(tokenRow.userId, credentialId);
  },

  async getLoginVaultUnlockOptions(
    loginToken: string,
    credentialId: string,
    ip?: string
  ) {
    const tokenRow = await loginTokenRepository.findValidLoginToken(hashOpaqueToken(loginToken));
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
      throw new NotFoundError("This passkey cannot unlock your vault.");
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
