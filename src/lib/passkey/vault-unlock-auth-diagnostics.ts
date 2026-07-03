import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import {
  collectPasskeyTransportHints,
  inferAuthenticatorAttachmentFromTransports,
  type PasskeyAuthenticatorAttachmentHint,
} from "@/lib/passkey/passkey-transports";

export type VaultUnlockAuthDiagnostic = {
  purpose: "vault_unlock";
  allowCredentialsCount: number;
  scopedCredentialIdPrefix: string | null;
  transportHints: string[];
  prfMode: "eval" | "evalByCredential" | "none";
  authenticatorAttachmentAtRegistration: PasskeyAuthenticatorAttachmentHint;
  userVerification: string | undefined;
};

function resolvePrfMode(
  extensions: PublicKeyCredentialRequestOptionsJSON["extensions"]
): VaultUnlockAuthDiagnostic["prfMode"] {
  const prf = extensions as { prf?: { eval?: unknown; evalByCredential?: unknown } } | undefined;
  if (!prf?.prf) return "none";
  if (prf.prf.evalByCredential) return "evalByCredential";
  if (prf.prf.eval) return "eval";
  return "none";
}

export function buildVaultUnlockAuthDiagnostic(
  options: PublicKeyCredentialRequestOptionsJSON,
  scopedCredentialId?: string
): VaultUnlockAuthDiagnostic {
  const credentialId =
    scopedCredentialId ??
    (options.allowCredentials?.length === 1 ? options.allowCredentials[0]?.id : undefined);

  return {
    purpose: "vault_unlock",
    allowCredentialsCount: options.allowCredentials?.length ?? 0,
    scopedCredentialIdPrefix: credentialId ? credentialId.slice(0, 8) : null,
    transportHints: collectPasskeyTransportHints(options.allowCredentials),
    prfMode: resolvePrfMode(options.extensions),
    authenticatorAttachmentAtRegistration: inferAuthenticatorAttachmentFromTransports(
      options.allowCredentials
    ),
    userVerification: options.userVerification,
  };
}

/** Dev-only logging for vault unlock WebAuthn option shaping (no secrets). */
export function logVaultUnlockAuthDiagnostic(
  options: PublicKeyCredentialRequestOptionsJSON,
  scopedCredentialId?: string
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  const diagnostic = buildVaultUnlockAuthDiagnostic(options, scopedCredentialId);
  console.info("vault passkey unlock options", diagnostic);
}
