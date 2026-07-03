import {
  PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE,
  PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE,
} from "@/lib/passkey/messages";

/** Map Web Crypto / vault-wrap failures to vault-passkey user-facing copy. */
export function mapPasskeyCryptoError(error: unknown): string | null {
  if (error instanceof Error) {
    if (error.message.includes(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE)) {
      return error.message;
    }
    if (error.message.includes("Cannot wrap a non-extractable vault key")) {
      return PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE;
    }
    if (error.message.includes("Inner vault key blob does not match")) {
      return PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE;
    }
    if (error.message.includes("Vault key mismatch during passkey envelope re-wrap")) {
      return PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE;
    }
  }

  const name =
    error instanceof DOMException ? error.name : error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    name === "OperationError" ||
    name === "DataError" ||
    lower.includes("data provided to an operation does not meet requirements") ||
    lower.includes("aes key data must be 128 or 256 bits") ||
    lower.includes("the operation failed for an operation-specific reason")
  ) {
    return PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE;
  }

  return null;
}

export function toPasskeyCeremonyErrorMessage(error: unknown, fallback: string): string {
  return mapPasskeyCryptoError(error) ?? (error instanceof Error ? error.message : fallback);
}
