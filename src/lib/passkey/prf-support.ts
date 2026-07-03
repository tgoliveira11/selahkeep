export type PasskeyPrfSupport = "supported" | "unsupported" | "unknown";

function isPasskeySupported(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof globalThis.PublicKeyCredential !== "undefined"
  );
}

/** Apple platform passkeys expose WebAuthn PRF from iOS/iPadOS 18+ (WebKit). */
export const APPLE_MOBILE_PRF_MIN_MAJOR_VERSION = 18;

const IOS_VERSION_RE = /(?:iPhone|iPod|iPad).*?OS (\d+)[_.]/i;
const IPADOS_VERSION_RE = /iPad.*?OS (\d+)[_.]/i;
const MACOS_TOUCH_VERSION_RE = /Mac OS X (\d+)[_.].*Mobile/i;

/** Parses the major OS version from a mobile Safari / WebKit user agent, if present. */
export function parseAppleMobileOsMajorVersion(userAgent: string): number | null {
  const match =
    userAgent.match(IOS_VERSION_RE) ??
    userAgent.match(IPADOS_VERSION_RE) ??
    userAgent.match(MACOS_TOUCH_VERSION_RE);
  if (!match) return null;
  const major = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(major) ? major : null;
}

/**
 * True on iPhone/iPad user agents below {@link APPLE_MOBILE_PRF_MIN_MAJOR_VERSION}.
 * Used to hide vault passkey unlock where WebAuthn works but PRF does not.
 */
export function isAppleMobileUserAgent(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /iPhone|iPod|iPad/.test(ua);
}

export function isAppleMobileBelowPrfMinimum(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!ua) return false;
  if (!/iPhone|iPod|iPad/.test(ua)) return false;
  const major = parseAppleMobileOsMajorVersion(ua);
  if (major === null) return false;
  return major < APPLE_MOBILE_PRF_MIN_MAJOR_VERSION;
}

type PublicKeyCredentialWithCapabilities = typeof PublicKeyCredential & {
  getClientCapabilities?: () => Promise<Record<string, boolean>>;
};

/**
 * Optimistic PRF gate for UI affordances (vault dock, settings entry points).
 * Matches vault-core: only false when WebAuthn is unavailable. Ceremony PRF output
 * remains the authoritative check for envelope create/unwrap.
 */
export function isPrfExtensionSupported(): boolean {
  if (!isPasskeySupported()) {
    return false;
  }
  if (isAppleMobileBelowPrfMinimum()) {
    return false;
  }
  return (
    typeof PublicKeyCredential !== "undefined" &&
    "getClientExtensionResults" in PublicKeyCredential.prototype
  );
}

/**
 * Whether vault passkey unlock should be offered in this browser before a ceremony.
 * Fails closed on Apple mobile below iOS/iPadOS 18; otherwise matches optimistic PRF gate.
 */
export function isVaultPasskeyUnlockSupportedInBrowser(): boolean {
  return isPrfExtensionSupported();
}

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
    // Some browsers report false pre-ceremony while still returning PRF output.
    return "unknown";
  } catch {
    return "unknown";
  }
}
