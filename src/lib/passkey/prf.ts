import { createHash } from "crypto";
import type { AuthenticationExtensionsClientInputs } from "@simplewebauthn/server";
import { SELAHKEEP_PRF_SALT_PREFIX } from "@/modules/vault/selahkeep-profile";

export function passkeyPrfSaltBytes(userId: string): Uint8Array {
  return new Uint8Array(
    createHash("sha256").update(`${SELAHKEEP_PRF_SALT_PREFIX}${userId}`).digest()
  );
}

export function passkeyPrfSaltBase64Url(userId: string): string {
  return Buffer.from(passkeyPrfSaltBytes(userId)).toString("base64url");
}

/**
 * PRF inputs for WebAuthn ceremonies. Always `prf.eval` with the stable per-user
 * salt (SHA-256 of `SELAHKEEP_PRF_SALT_PREFIX + userId`) — the vault-core canonical
 * contract. Vault unlock scopes to a single credential server-side, so
 * `evalByCredential` is never used: iOS/Safari can return divergent PRF bytes for it.
 */
export function passkeyPrfExtensions(userId: string): AuthenticationExtensionsClientInputs {
  const salt = passkeyPrfSaltBase64Url(userId);
  return {
    prf: {
      eval: { first: salt },
    },
  } as AuthenticationExtensionsClientInputs;
}
