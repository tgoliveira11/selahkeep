import {
  PASSKEY_UNLOCK_DECRYPT_FAILED_MESSAGE,
  PASSKEY_UNLOCK_NO_ENVELOPE_MESSAGE,
  PASSKEY_UNLOCK_PRF_UNAVAILABLE_MESSAGE,
  PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE,
  PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE,
  PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE,
  PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE,
} from "@/lib/passkey/messages";

export function mapVaultUnlockError(message: string | null): string | null {
  if (!message) return null;
  if (message.includes(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE)) {
    return PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE;
  }
  if (message.includes(PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE)) {
    return PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE;
  }
  if (message.includes(PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE)) {
    return PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE;
  }
  if (message.includes(PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE)) {
    return PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE;
  }
  if (message.includes("not set up to unlock")) return PASSKEY_UNLOCK_NO_ENVELOPE_MESSAGE;
  if (message.includes("PRF support") || message.includes("did not return PRF output")) {
    return PASSKEY_UNLOCK_PRF_UNAVAILABLE_MESSAGE;
  }
  if (message.includes("Could not decrypt")) return PASSKEY_UNLOCK_DECRYPT_FAILED_MESSAGE;
  if (message.includes("Incorrect vault password")) return "Incorrect vault password";
  if (message.includes("Incorrect recovery phrase")) return "Incorrect recovery phrase";
  if (message.includes("operation failed for an operation-specific reason")) {
    return "Incorrect vault password or recovery phrase";
  }
  return message;
}
