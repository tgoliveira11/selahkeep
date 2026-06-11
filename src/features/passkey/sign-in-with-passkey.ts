import { startAuthentication } from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import { passkeyLoginApi } from "@/lib/api-client/passkey-login";
import {
  extractPasskeyPrfOutput,
  isPasskeySupported,
  unlockVaultFromPasskeyEnvelope,
} from "@/lib/crypto-client/passkey-vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";
import { PasskeyPrfRequiredError } from "@/lib/crypto-client/passkey-vault";
import {
  getPasskeyLoginHint,
  setPasskeyLoginHint,
  type PasskeyLoginHint,
} from "@/lib/passkey/login-hint";

export const PASSKEY_LOGIN_OUTCOME_KEY = "letters-passkey-login-outcome";

export type PasskeyLoginOutcome =
  | "vault-unlocked"
  | "vault-locked"
  | "prf-unavailable"
  | "cancelled"
  | "unsupported";

export function getPasskeyLoginUnsupportedMessage(): string {
  return "This browser does not support passkey sign-in.";
}

export function isPasskeyLoginSupported(): boolean {
  return isPasskeySupported();
}

export function buildPasskeyLoginOptionsPayload(
  email?: string,
  hint?: PasskeyLoginHint | null
): { email: string } | { credentialId: string; userId?: string } | { userId: string } | undefined {
  const trimmedEmail = email?.trim();
  if (trimmedEmail) return { email: trimmedEmail };
  if (hint?.credentialId) {
    return hint.userId
      ? { credentialId: hint.credentialId, userId: hint.userId }
      : { credentialId: hint.credentialId };
  }
  if (hint?.userId) return { userId: hint.userId };
  return undefined;
}

export async function signInWithPasskey(input?: { email?: string }): Promise<{
  outcome: PasskeyLoginOutcome;
  redirectTo: string;
}> {
  if (!isPasskeyLoginSupported()) {
    return { outcome: "unsupported", redirectTo: "/login" };
  }

  const cachedHint = getPasskeyLoginHint();
  const optionsPayload = buildPasskeyLoginOptionsPayload(input?.email, cachedHint);

  let optionsResponse;
  try {
    optionsResponse = await passkeyLoginApi.options(optionsPayload);
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { outcome: "cancelled", redirectTo: "/login" };
    }
    throw error;
  }

  let assertion;
  try {
    assertion = await startAuthentication({
      optionsJSON: prepareAuthenticationOptions(optionsResponse.options),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { outcome: "cancelled", redirectTo: "/login" };
    }
    throw error;
  }

  let prfOutput = extractPasskeyPrfOutput(assertion.clientExtensionResults);
  const verifyResult = await passkeyLoginApi.verify({ response: assertion });

  setPasskeyLoginHint({
    userId: verifyResult.userId,
    credentialId: verifyResult.credentialId ?? assertion.id,
  });

  let encryptedVaultKey = verifyResult.encryptedVaultKey;
  let prfRequired = verifyResult.prfRequired;

  if (
    verifyResult.vaultUnlockAvailable &&
    encryptedVaultKey &&
    !prfOutput &&
    !optionsResponse.prfIncluded
  ) {
    try {
      const vaultUnlockOptions = await passkeyLoginApi.vaultUnlockOptions({
        loginToken: verifyResult.loginToken,
        credentialId: verifyResult.credentialId,
      });
      encryptedVaultKey = vaultUnlockOptions.encryptedVaultKey;
      prfRequired = vaultUnlockOptions.prfRequired;

      const vaultAssertion = await startAuthentication({
        optionsJSON: prepareAuthenticationOptions(vaultUnlockOptions.options),
      });
      prfOutput = extractPasskeyPrfOutput(vaultAssertion.clientExtensionResults);
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        return { outcome: "cancelled", redirectTo: "/login" };
      }
    }
  }

  if (verifyResult.vaultUnlockAvailable && encryptedVaultKey && prfOutput) {
    try {
      await unlockVaultFromPasskeyEnvelope(
        verifyResult.userId,
        encryptedVaultKey,
        prfOutput,
        { prfRequired }
      );
    } catch (error) {
      if (error instanceof PasskeyPrfRequiredError) {
        sessionStorage.setItem(PASSKEY_LOGIN_OUTCOME_KEY, "prf-unavailable");
      } else {
        sessionStorage.setItem(PASSKEY_LOGIN_OUTCOME_KEY, "vault-locked");
      }
    }
  } else if (verifyResult.vaultUnlockAvailable && !prfOutput) {
    sessionStorage.setItem(
      PASSKEY_LOGIN_OUTCOME_KEY,
      optionsResponse.prfIncluded ? "prf-unavailable" : "vault-locked"
    );
  }

  const authResult = await signIn("login-token", {
    loginToken: verifyResult.loginToken,
    redirect: false,
  });

  if (authResult?.error) {
    throw new Error("Passkey sign-in could not complete your session.");
  }

  const vaultUnlocked = isVaultUnlocked();
  if (vaultUnlocked) {
    sessionStorage.setItem(PASSKEY_LOGIN_OUTCOME_KEY, "vault-unlocked");
    return { outcome: "vault-unlocked", redirectTo: "/letters" };
  }

  const stored = sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY) as PasskeyLoginOutcome | null;
  if (stored === "prf-unavailable") {
    return { outcome: "prf-unavailable", redirectTo: "/vault/unlock" };
  }

  sessionStorage.setItem(PASSKEY_LOGIN_OUTCOME_KEY, "vault-locked");
  return { outcome: "vault-locked", redirectTo: "/vault/unlock" };
}
