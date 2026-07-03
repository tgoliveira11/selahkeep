import { isPasskeySupported } from "@/modules/vault/client/passkey-prf";
import {
  DEFAULT_APPLE_MOBILE_PRF_MIN_MAJOR_VERSION,
  isAppleMobileUserAgent as isAppleMobileUserAgentCore,
  isPrfExtensionSupported as isPrfExtensionSupportedCore,
  parseAppleMobileOsMajorVersion as parseAppleMobileOsMajorVersionCore,
} from "@tgoliveira/vault-core/browser";

export type PasskeyPrfSupport = "supported" | "unsupported" | "unknown";

export const APPLE_MOBILE_PRF_MIN_MAJOR_VERSION = DEFAULT_APPLE_MOBILE_PRF_MIN_MAJOR_VERSION;

export const parseAppleMobileOsMajorVersion = parseAppleMobileOsMajorVersionCore;

export function isAppleMobileUserAgent(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return isAppleMobileUserAgentCore(ua);
}

export function isAppleMobileBelowPrfMinimum(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!isAppleMobileUserAgentCore(ua)) return false;
  const major = parseAppleMobileOsMajorVersionCore(ua);
  if (major === null) return false;
  return major < DEFAULT_APPLE_MOBILE_PRF_MIN_MAJOR_VERSION;
}

/**
 * Optimistic PRF gate for UI affordances (vault dock, settings entry points).
 * Ceremony PRF output remains the authoritative check for envelope create/unwrap.
 */
export function isPrfExtensionSupported(): boolean {
  if (!isPasskeySupported()) {
    return false;
  }
  return isPrfExtensionSupportedCore();
}

/**
 * Whether vault passkey unlock should be offered in this browser before a ceremony.
 * Fails closed on Apple mobile below iOS/iPadOS 18; otherwise matches optimistic PRF gate.
 */
export function isVaultPasskeyUnlockSupportedInBrowser(): boolean {
  return isPrfExtensionSupported();
}

type PublicKeyCredentialWithCapabilities = typeof PublicKeyCredential & {
  getClientCapabilities?: () => Promise<Record<string, boolean>>;
};

/**
 * Best-effort PRF support detection before starting WebAuthn registration.
 * Returns "unknown" when the browser does not expose capability probes or reports
 * `extension:prf === false` — callers must verify PRF output after the ceremony.
 */
export async function detectPasskeyPrfSupport(): Promise<PasskeyPrfSupport> {
  if (!isPasskeySupported()) {
    return "unsupported";
  }

  const PublicKeyCredentialCtor = PublicKeyCredential as PublicKeyCredentialWithCapabilities;
  if (typeof PublicKeyCredentialCtor.getClientCapabilities !== "function") {
    return "unknown";
  }

  try {
    const capabilities = await PublicKeyCredentialCtor.getClientCapabilities();
    if (capabilities["extension:prf"] === true) {
      return "supported";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}
