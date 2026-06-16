import { startAuthentication } from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import { passkeyLoginApi } from "@/lib/api-client/passkey-login";
import {
  extractPasskeyPrfOutput,
  isPasskeySupported,
  unlockVaultFromPasskeyEnvelope,
  PasskeyPrfRequiredError,
} from "@/lib/crypto-client/passkey-vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";
import { APP_PASSKEY_SLUG } from "@/lib/passkey/app-slug";
import {
  getPasskeyLoginHint,
  setPasskeyLoginHint,
  type PasskeyLoginHint,
} from "@/lib/passkey/login-hint";
import { logPasskeyLoginVaultEvent } from "@/features/passkey/passkey-login-audit";

export type PasskeyLoginOutcome =
  | "vault-unlocked"
  | "vault-locked"
  | "prf-unavailable"
  | "cancelled"
  | "unsupported";

export type SignInWithPasskeyOptions = {
  appSlug?: string;
  loginPath?: string;
  afterLoginPath?: string;
};

export function buildPasskeyLoginOutcomeKey(appSlug: string = APP_PASSKEY_SLUG): string {
  return `${appSlug}-passkey-login-outcome`;
}

export const PASSKEY_LOGIN_OUTCOME_KEY = buildPasskeyLoginOutcomeKey();

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

export async function signInWithPasskey(
  input?: { email?: string },
  options: SignInWithPasskeyOptions = {}
): Promise<{
  outcome: PasskeyLoginOutcome;
  redirectTo: string;
}> {
  const appSlug = options.appSlug ?? APP_PASSKEY_SLUG;
  const loginPath = options.loginPath ?? "/login";
  const afterLoginPath = options.afterLoginPath ?? "/letters";
  const outcomeKey = buildPasskeyLoginOutcomeKey(appSlug);

  if (!isPasskeyLoginSupported()) {
    return { outcome: "unsupported", redirectTo: loginPath };
  }

  const cachedHint = getPasskeyLoginHint();
  const optionsPayload = buildPasskeyLoginOptionsPayload(input?.email, cachedHint);

  let optionsResponse;
  try {
    optionsResponse = await passkeyLoginApi.options(optionsPayload);
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { outcome: "cancelled", redirectTo: loginPath };
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
      return { outcome: "cancelled", redirectTo: loginPath };
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
        return { outcome: "cancelled", redirectTo: loginPath };
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
      logPasskeyLoginVaultEvent("passkey_login_vault_unlock_succeeded", { method: "passkey" });
    } catch (error) {
      if (error instanceof PasskeyPrfRequiredError) {
        sessionStorage.setItem(outcomeKey, "prf-unavailable");
        logPasskeyLoginVaultEvent("passkey_login_vault_unlock_unavailable", {
          method: "passkey",
          errorCode: "prf_required",
        });
      } else {
        sessionStorage.setItem(outcomeKey, "vault-locked");
        logPasskeyLoginVaultEvent("passkey_login_vault_unlock_failed", { method: "passkey" });
      }
    }
  } else if (verifyResult.vaultUnlockAvailable && !prfOutput) {
    sessionStorage.setItem(
      outcomeKey,
      optionsResponse.prfIncluded ? "prf-unavailable" : "vault-locked"
    );
    logPasskeyLoginVaultEvent("passkey_login_vault_unlock_unavailable", {
      method: "passkey",
      errorCode: optionsResponse.prfIncluded ? "prf_missing" : "prf_not_included",
    });
  } else if (!verifyResult.vaultUnlockAvailable) {
    logPasskeyLoginVaultEvent("passkey_login_vault_unlock_unavailable", {
      method: "passkey",
      errorCode: "no_envelope",
    });
  }

  const authResult = await signIn("login-token", {
    loginToken: verifyResult.loginToken,
    redirect: false,
  });

  if (authResult?.error) {
    throw new Error("Passkey sign-in could not complete your session.");
  }

  logPasskeyLoginVaultEvent("passkey_login_completed", { method: "passkey" });

  const vaultUnlocked = isVaultUnlocked();
  if (vaultUnlocked) {
    sessionStorage.setItem(outcomeKey, "vault-unlocked");
    return { outcome: "vault-unlocked", redirectTo: afterLoginPath };
  }

  const stored = sessionStorage.getItem(outcomeKey) as PasskeyLoginOutcome | null;
  if (stored === "prf-unavailable") {
    return { outcome: "prf-unavailable", redirectTo: "/vault/unlock" };
  }

  sessionStorage.setItem(outcomeKey, "vault-locked");
  return { outcome: "vault-locked", redirectTo: "/vault/unlock" };
}
