import { isPasskeySupported } from "@/lib/crypto-client/passkey-vault";
import {
  detectPasskeyPrfSupport,
  isAppleMobileBelowPrfMinimum,
  type PasskeyPrfSupport,
} from "@/lib/passkey/prf-support";

export type PasskeyPrfDiagnosticReason =
  | "supported"
  | "unknown"
  | "unsupported"
  | "ceremony_cancelled"
  | "prf_not_returned"
  | "secure_context_required"
  | "webauthn_unavailable";

export type PasskeyPrfEnvironmentSnapshot = {
  userAgent: string;
  secureContext: boolean;
  webauthnAvailable: boolean;
  credentialsApiAvailable: boolean;
  clientCapabilitiesAvailable: boolean;
  /** `true` / `false` when reported; `null` when missing or probe failed. */
  clientCapabilitiesPrf: boolean | null;
  capabilityProbe: PasskeyPrfSupport;
};

export type PasskeyPrfCeremonySnapshot = {
  prfRequested: boolean;
  prfReturned: boolean;
  ceremonyCancelled: boolean;
  safeErrorName: string | null;
};

type PublicKeyCredentialWithCapabilities = typeof PublicKeyCredential & {
  getClientCapabilities?: () => Promise<Record<string, boolean>>;
};

const SAFE_WEBAUTHN_ERROR_NAMES = new Set([
  "NotAllowedError",
  "NotSupportedError",
  "SecurityError",
  "InvalidStateError",
  "AbortError",
  "TimeoutError",
]);

export function probePasskeyPrfEnvironment(): PasskeyPrfEnvironmentSnapshot {
  const secureContext = typeof window !== "undefined" ? window.isSecureContext : false;
  const webauthnAvailable = isPasskeySupported();
  const credentialsApiAvailable =
    typeof navigator !== "undefined" && typeof navigator.credentials !== "undefined";

  const PublicKeyCredentialCtor = globalThis.PublicKeyCredential as
    | PublicKeyCredentialWithCapabilities
    | undefined;
  const clientCapabilitiesAvailable =
    typeof PublicKeyCredentialCtor?.getClientCapabilities === "function";

  return {
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    secureContext,
    webauthnAvailable,
    credentialsApiAvailable,
    clientCapabilitiesAvailable,
    clientCapabilitiesPrf: null,
    capabilityProbe: webauthnAvailable ? "unknown" : "unsupported",
  };
}

export async function probePasskeyPrfEnvironmentAsync(): Promise<PasskeyPrfEnvironmentSnapshot> {
  const base = probePasskeyPrfEnvironment();

  if (!base.secureContext) {
    return { ...base, capabilityProbe: "unsupported" };
  }

  if (!base.webauthnAvailable) {
    return { ...base, capabilityProbe: "unsupported" };
  }

  const capabilityProbe = await detectPasskeyPrfSupport();
  let clientCapabilitiesPrf: boolean | null = null;

  const PublicKeyCredentialCtor = globalThis.PublicKeyCredential as
    | PublicKeyCredentialWithCapabilities
    | undefined;

  if (typeof PublicKeyCredentialCtor?.getClientCapabilities === "function") {
    try {
      const capabilities = await PublicKeyCredentialCtor.getClientCapabilities();
      if (capabilities["extension:prf"] === true) {
        clientCapabilitiesPrf = true;
      } else if (capabilities["extension:prf"] === false) {
        clientCapabilitiesPrf = false;
      }
    } catch {
      clientCapabilitiesPrf = null;
    }
  }

  return {
    ...base,
    capabilityProbe,
    clientCapabilitiesPrf,
  };
}

export function mapCapabilityProbeToReason(
  probe: PasskeyPrfSupport,
  environment?: Pick<PasskeyPrfEnvironmentSnapshot, "secureContext" | "webauthnAvailable">
): PasskeyPrfDiagnosticReason {
  if (environment && !environment.secureContext) {
    return "secure_context_required";
  }
  if (environment && !environment.webauthnAvailable) {
    return "webauthn_unavailable";
  }
  if (probe === "supported") return "supported";
  if (probe === "unsupported") return "unsupported";
  return "unknown";
}

export function resolvePreCeremonyDiagnosticReason(
  environment: PasskeyPrfEnvironmentSnapshot
): PasskeyPrfDiagnosticReason | null {
  if (!environment.secureContext) {
    return "secure_context_required";
  }
  if (!environment.webauthnAvailable || !environment.credentialsApiAvailable) {
    return "webauthn_unavailable";
  }
  if (isAppleMobileBelowPrfMinimum(environment.userAgent)) {
    return "unsupported";
  }
  if (environment.capabilityProbe === "unsupported") {
    return "unsupported";
  }
  return null;
}

export function resolveCeremonyDiagnosticReason(input: {
  prfOutputPresent: boolean;
  cancelled?: boolean;
  error?: unknown;
}): PasskeyPrfDiagnosticReason {
  if (input.cancelled || isCeremonyCancellation(input.error)) {
    return "ceremony_cancelled";
  }
  if (input.prfOutputPresent) {
    return "supported";
  }
  return "prf_not_returned";
}

export function isCeremonyCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "NotAllowedError";
}

export function safeWebAuthnErrorName(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  return SAFE_WEBAUTHN_ERROR_NAMES.has(error.name) ? error.name : "Error";
}

export function shouldBlockPasskeyVaultSetupBeforeCeremony(
  environment: PasskeyPrfEnvironmentSnapshot
): boolean {
  return resolvePreCeremonyDiagnosticReason(environment) !== null;
}

/** True when this browser cannot safely manage an existing passkey_prf envelope. */
export function isPasskeyPrfManagementBlocked(
  environment: PasskeyPrfEnvironmentSnapshot | null
): boolean {
  if (!environment) return false;
  return shouldBlockPasskeyVaultSetupBeforeCeremony(environment);
}

export function getPasskeyPrfDiagnosticHeadline(reason: PasskeyPrfDiagnosticReason): string {
  switch (reason) {
    case "supported":
      return "Passkey vault unlock is available on this browser.";
    case "unknown":
      return "PRF support could not be confirmed before setup";
    case "unsupported":
      return "PRF extension not supported on this browser";
    case "ceremony_cancelled":
      return "Passkey ceremony cancelled";
    case "prf_not_returned":
      return "Passkey did not return PRF output";
    case "secure_context_required":
      return "Secure connection required";
    case "webauthn_unavailable":
      return "WebAuthn not available";
  }
}

export function getPasskeyPrfDiagnosticMessage(reason: PasskeyPrfDiagnosticReason): string {
  switch (reason) {
    case "supported":
      return "Your browser returned PRF output from the passkey ceremony. Vault unlock can use this passkey.";
    case "unknown":
      return "This browser does not report PRF capability before setup. You can still try — vault unlock is only enabled when your passkey returns PRF output during the ceremony.";
    case "unsupported":
      return "This browser reports that the WebAuthn PRF extension is not supported, so SelahKeep cannot unlock your vault with a passkey here. On iPhone and iPad, vault passkey unlock requires iOS or iPadOS 18 or later. Use your vault password or recovery phrase, or try a PRF-capable browser.";
    case "ceremony_cancelled":
      return "The passkey prompt was dismissed or timed out. No changes were made.";
    case "prf_not_returned":
      return "Authentication completed, but your passkey provider did not return PRF output for vault unlock. Account passkey sign-in (including Enpass or iCloud Keychain) can work without PRF; unlocking your vault cannot. Use your vault password or recovery phrase, or enable vault passkey unlock again from /vault/settings on this browser while your vault is open.";
    case "secure_context_required":
      return "Passkey vault unlock requires HTTPS or localhost. Open SelahKeep over a secure connection and try again.";
    case "webauthn_unavailable":
      return "This browser does not expose WebAuthn (PublicKeyCredential). Passkey vault unlock cannot run here.";
  }
}

export function formatPasskeyPrfDiagnosticsReport(
  environment: PasskeyPrfEnvironmentSnapshot,
  ceremony?: PasskeyPrfCeremonySnapshot
): string {
  const lines = [
    `userAgent: ${environment.userAgent}`,
    `secureContext: ${environment.secureContext}`,
    `webauthnAvailable: ${environment.webauthnAvailable}`,
    `credentialsApiAvailable: ${environment.credentialsApiAvailable}`,
    `clientCapabilitiesAvailable: ${environment.clientCapabilitiesAvailable}`,
    `clientCapabilitiesPrf: ${String(environment.clientCapabilitiesPrf)}`,
    `capabilityProbe: ${environment.capabilityProbe}`,
  ];

  if (ceremony) {
    lines.push(
      `prfRequested: ${ceremony.prfRequested}`,
      `prfReturned: ${ceremony.prfReturned}`,
      `ceremonyCancelled: ${ceremony.ceremonyCancelled}`,
      `safeErrorName: ${ceremony.safeErrorName ?? "null"}`
    );
  }

  return lines.join("\n");
}
