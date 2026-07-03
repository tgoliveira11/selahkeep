import { classifyPasskeyCryptoError, PasskeyUnlockError, type PasskeyCryptoFailureKind } from "@tgoliveira/vault-core";
import {
  PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE,
  PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE,
} from "@/lib/passkey/messages";

const STILLNESS_MESSAGES: Partial<Record<PasskeyCryptoFailureKind, string>> = {
  prf_mismatch: PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE,
  rewrap_requires_unlock: PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE,
  decrypt_failed: PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE,
};

/** Map Web Crypto / vault-wrap failures to vault-passkey user-facing copy. */
export function mapPasskeyCryptoError(error: unknown): string | null {
  if (error instanceof Error) {
    if (error.message.includes(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE)) {
      return error.message;
    }
    if (error.message.includes("AES key data must be 128 or 256 bits")) {
      return PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE;
    }
  }

  // Let unlock-with-passkey apply Apple-mobile platform hints for ceremony decrypt failures.
  if (error instanceof PasskeyUnlockError) {
    return null;
  }

  const kind = classifyPasskeyCryptoError(error);
  return STILLNESS_MESSAGES[kind] ?? null;
}

export function toPasskeyCeremonyErrorMessage(error: unknown, fallback: string): string {
  return mapPasskeyCryptoError(error) ?? (error instanceof Error ? error.message : fallback);
}
