import {
  resolveWebAuthnOrigins,
  resolveWebAuthnSettings,
} from "@/lib/env/webauthn-from-env";

/** Allowed WebAuthn origins for registration and authentication verification. */
export function getWebAuthnOrigins(): string[] {
  return resolveWebAuthnOrigins();
}

export function getWebAuthnRpId(): string {
  return resolveWebAuthnSettings().rpId;
}

export function getWebAuthnRpName(): string {
  return resolveWebAuthnSettings().rpName;
}

export function getPrimaryWebAuthnOrigin(): string {
  return resolveWebAuthnSettings().origin;
}

/**
 * Maps low-level WebAuthn verification failures to user-safe copy (no secrets).
 */
export function toPasskeyVerificationErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Passkey authentication failed. Try again or use your recovery code.";
  }

  const message = error.message;

  if (
    message.includes("RP ID") ||
    message.includes("invalid for this domain") ||
    message.includes("rpId")
  ) {
    const { rpId, origin } = resolveWebAuthnSettings();
    return `Passkey setup failed because the site address does not match the configured relying party ID (${rpId}). Open ${origin} in your browser and set APP_BASE_URL, WEBAUTHN_ORIGIN, and WEBAUTHN_RP_ID in Vercel to that same host.`;
  }

  if (message.includes("origin")) {
    return `Passkey verification failed because this browser address does not match your app URL. Use ${getPrimaryWebAuthnOrigin()} (same host you used when setting up your passkey).`;
  }

  if (message.includes("challenge")) {
    return "Passkey verification expired. Please try again.";
  }

  if (message.includes("Credential ID")) {
    return "This passkey could not be matched to your account. Set up your passkey again from Recovery while your vault is unlocked.";
  }

  return "Passkey authentication failed. Try again or use your recovery code.";
}
