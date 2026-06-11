const DEFAULT_ORIGIN = "http://localhost:3001";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** Allowed WebAuthn origins for registration and authentication verification. */
export function getWebAuthnOrigins(): string[] {
  const configured = [
    process.env.WEBAUTHN_ORIGIN,
    process.env.NEXTAUTH_URL,
    DEFAULT_ORIGIN,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeOrigin);

  const origins = new Set<string>(configured);

  for (const origin of configured) {
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost") {
        origins.add(normalizeOrigin(origin.replace("localhost", "127.0.0.1")));
      }
      if (url.hostname === "127.0.0.1") {
        origins.add(normalizeOrigin(origin.replace("127.0.0.1", "localhost")));
      }
    } catch {
      // Ignore invalid URL entries in env.
    }
  }

  return [...origins];
}

export function getWebAuthnRpId(): string {
  return process.env.WEBAUTHN_RP_ID ?? "localhost";
}

export function getWebAuthnRpName(): string {
  return process.env.WEBAUTHN_RP_NAME ?? "Letters to God";
}

export function getPrimaryWebAuthnOrigin(): string {
  return normalizeOrigin(process.env.WEBAUTHN_ORIGIN ?? process.env.NEXTAUTH_URL ?? DEFAULT_ORIGIN);
}

/**
 * Maps low-level WebAuthn verification failures to user-safe copy (no secrets).
 */
export function toPasskeyVerificationErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Passkey authentication failed. Try again or use your recovery code.";
  }

  const message = error.message;

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
