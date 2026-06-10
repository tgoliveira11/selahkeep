import { createHash } from "crypto";
import type { AuthenticationExtensionsClientInputs } from "@simplewebauthn/server";

const PRF_SALT_PREFIX = "letters-passkey-prf-v1:";

export function passkeyPrfSaltBytes(userId: string): Uint8Array {
  return new Uint8Array(
    createHash("sha256").update(`${PRF_SALT_PREFIX}${userId}`).digest()
  );
}

export function passkeyPrfSaltBase64Url(userId: string): string {
  return Buffer.from(passkeyPrfSaltBytes(userId)).toString("base64url");
}

export function passkeyPrfExtensions(userId: string): AuthenticationExtensionsClientInputs {
  return {
    prf: {
      eval: {
        first: passkeyPrfSaltBase64Url(userId),
      },
    },
  } as AuthenticationExtensionsClientInputs;
}
