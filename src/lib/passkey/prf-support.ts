import { isPasskeySupported } from "@/lib/crypto-client/passkey-vault";

export type PasskeyPrfSupport = "supported" | "unsupported" | "unknown";

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
  return (
    typeof PublicKeyCredential !== "undefined" &&
    "getClientExtensionResults" in PublicKeyCredential.prototype
  );
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
