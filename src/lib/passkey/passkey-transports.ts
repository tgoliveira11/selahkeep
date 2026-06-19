import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

export type StoredPasskeyTransports = AuthenticatorTransportFuture[] | null | undefined;

function coerceStoredPasskeyTransports(transports: unknown): StoredPasskeyTransports {
  if (!Array.isArray(transports) || transports.length === 0) {
    return null;
  }
  return transports as AuthenticatorTransportFuture[];
}

/** Returns stored transports when the browser reported them; otherwise undefined (no guessing). */
export function storedPasskeyTransports(
  transports: StoredPasskeyTransports | unknown
): AuthenticatorTransportFuture[] | undefined {
  const normalized = coerceStoredPasskeyTransports(transports);
  if (!normalized || normalized.length === 0) {
    return undefined;
  }
  return [...normalized];
}

/** Persists browser-reported transports exactly; returns null when absent (no unsafe defaults). */
export function persistRegistrationTransports(
  transports: AuthenticatorTransportFuture[] | undefined
): AuthenticatorTransportFuture[] | null {
  if (!transports || transports.length === 0) {
    return null;
  }
  return [...transports];
}

export function toAllowCredentialDescriptor(credential: {
  credentialId: string;
  transports?: unknown;
}): { id: string; transports?: AuthenticatorTransportFuture[] } {
  const transports = storedPasskeyTransports(credential.transports);
  return transports ? { id: credential.credentialId, transports } : { id: credential.credentialId };
}

export type PasskeyTransportHint =
  | "internal"
  | "hybrid"
  | "usb"
  | "nfc"
  | "ble"
  | "none"
  | "mixed";

export type PasskeyAuthenticatorAttachmentHint = "platform" | "cross-platform" | "unknown";

const CROSS_PLATFORM_TRANSPORTS = new Set(["hybrid", "usb", "nfc", "ble"]);

/** Collects unique transport labels from allowCredentials (no credential IDs). */
export function collectPasskeyTransportHints(
  allowCredentials: Array<{ transports?: AuthenticatorTransportFuture[] }> | undefined
): string[] {
  if (!allowCredentials || allowCredentials.length === 0) {
    return ["none"];
  }

  const hints = new Set<string>();
  for (const credential of allowCredentials) {
    if (!credential.transports || credential.transports.length === 0) {
      hints.add("none");
      continue;
    }
    for (const transport of credential.transports) {
      hints.add(transport);
    }
  }

  if (hints.size === 0) {
    return ["none"];
  }

  return [...hints].sort();
}

/** Safe transport summary for development diagnostics (no credential IDs). */
export function summarizePasskeyTransportHints(
  allowCredentials: Array<{ transports?: AuthenticatorTransportFuture[] }> | undefined
): PasskeyTransportHint {
  const hints = collectPasskeyTransportHints(allowCredentials);
  if (hints.length === 1 && hints[0] === "none") {
    return "none";
  }
  if (hints.length === 1) {
    return hints[0] as PasskeyTransportHint;
  }
  return "mixed";
}

/** Infers likely authenticator attachment from stored transports (no guessing beyond transport evidence). */
export function inferAuthenticatorAttachmentFromTransports(
  allowCredentials: Array<{ transports?: AuthenticatorTransportFuture[] }> | undefined
): PasskeyAuthenticatorAttachmentHint {
  const hints = collectPasskeyTransportHints(allowCredentials);
  if (hints.length === 1 && hints[0] === "none") {
    return "unknown";
  }
  if (hints.some((hint) => CROSS_PLATFORM_TRANSPORTS.has(hint))) {
    return "cross-platform";
  }
  if (hints.includes("internal")) {
    return "platform";
  }
  return "unknown";
}

type VaultRegistrationCredential = {
  credentialId: string;
  vaultUnlockEnabled?: boolean;
  transports?: unknown;
};

/** Active vault-enabled credentials to exclude from vault-only registration (MVP: one vault passkey). */
export function vaultRegistrationExcludeCredentials(
  credentials: VaultRegistrationCredential[]
): Array<{ id: string; transports?: AuthenticatorTransportFuture[] }> {
  return credentials
    .filter((credential) => credential.vaultUnlockEnabled)
    .map((credential) => toAllowCredentialDescriptor(credential));
}
