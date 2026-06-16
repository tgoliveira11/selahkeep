import {
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import { passkeyRepository } from "@/server/repositories/passkey-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { enforceRateLimit } from "@/server/policies/rate-limit";
import { passkeyPrfExtensions } from "@/lib/passkey/prf";
import { getWebAuthnOrigins, getWebAuthnRpId } from "@/lib/passkey/webauthn-config";
import { loginTokenRepository } from "@/modules/auth/repositories/login-token-repository";
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

/** Vault-only passkey helpers; account sign-in passkeys are handled by @tgoliveira/secure-auth. */
export const passkeyLoginService = {
  async getVaultUnlockMetadataForCredential(userId: string, credentialId: string) {
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
