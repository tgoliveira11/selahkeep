import { isPasskeySupported } from "@/lib/crypto-client/passkey-vault";

export type PasskeyPrfSupport = "supported" | "unsupported" | "unknown";

type PublicKeyCredentialWithCapabilities = typeof PublicKeyCredential & {
  getClientCapabilities?: () => Promise<Record<string, boolean>>;
};

/**
 * Best-effort PRF support detection before starting WebAuthn registration.
 * Returns "unknown" when the browser does not expose capability probes — caller
 * must still verify PRF output after registration and fail closed server-side.
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
    if (capabilities["extension:prf"] === false) {
      return "unsupported";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}
