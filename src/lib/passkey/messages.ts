import {
  getPasskeyPrfDiagnosticMessage,
  type PasskeyPrfDiagnosticReason,
} from "@/lib/passkey/passkey-prf-diagnostics";

export const PASSKEY_PRF_UNAVAILABLE_HEADLINE =
  "This browser or passkey provider does not support vault unlock with passkey. Your vault was not linked to this passkey. Use your vault password or recovery phrase to unlock.";

export function passkeyPrfDiagnosticMessage(reason: PasskeyPrfDiagnosticReason): string {
  return getPasskeyPrfDiagnosticMessage(reason);
}

export const PASSKEY_ORPHAN_CREDENTIAL_NOTE =
  "Your device may still show a passkey created by the browser, but it was not registered by this app for vault recovery.";

export const PASSKEY_VAULT_REGISTERED_MESSAGE =
  "Passkey registered. You can unlock your vault on a new device with your passkey.";

export type PasskeySetupOutcome =
  | "idle"
  | "vault-registered"
  | "prf-unavailable"
  | "cancelled"
  | "failed";

export const PASSKEY_LOGIN_CANCELLED_MESSAGE = "Passkey sign-in was cancelled.";

export const PASSKEY_LOGIN_UNSUPPORTED_MESSAGE =
  "This browser does not support passkey sign-in.";

export const PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE =
  "Passkey vault unlock is now enabled for this passkey.";

export const PASSKEY_VAULT_UNLOCK_ENABLED_REFRESH_WARNING =
  "Passkey vault unlock is enabled, but the updated status could not be loaded. Refresh this page to update it.";

export const PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE =
  "Passkey vault unlock was disabled. This passkey can still sign you in.";

export const PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE =
  "Passkey vault unlock is not configured yet.";

export const PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE =
  "This passkey is for account sign-in, not vault unlock.";

export const PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE =
  "This passkey is not linked to vault unlock.";

export const PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE =
  "This passkey is not available for vault unlock.";

export const PASSKEY_UNLOCK_NO_ENVELOPE_MESSAGE =
  "You are signed in, but this passkey is not set up to unlock your vault.";

export const PASSKEY_UNLOCK_PRF_UNAVAILABLE_MESSAGE =
  "Passkey vault unlock is not supported by this browser or passkey provider.";

export const PASSKEY_UNLOCK_DECRYPT_FAILED_MESSAGE =
  "We could not unlock your vault with this passkey. Use your vault password or recovery phrase.";

/** Shown when WebAuthn succeeds but PRF bytes do not match the stored vault envelope. */
export const PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE =
  "This passkey completed vault unlock authentication, but it could not derive the vault key on this device. Vault passkey unlock requires PRF output from the same provider and device where you enabled it. Unlock with your vault password or recovery phrase, or add a passkey for this device from /vault/settings while your vault is open.";

/** iPhone/iPad decrypt failure — per-device PRF and iCloud Keychain guidance. */
export const PASSKEY_UNLOCK_PRF_MISMATCH_APPLE_HINT_MESSAGE =
  "This passkey authenticated, but it could not unlock your vault on this iPhone or iPad. Vault passkey unlock is per device: set it up on the same phone or tablet where you want to unlock (Settings → passkey vault unlock → Add a passkey for this device). If you use Enpass or another password manager for account sign-in, try iCloud Keychain (Face ID / Touch ID) instead. You can also unlock with your vault password or recovery phrase.";

/** Shown when the OS is too old for mobile WebAuthn PRF (iOS/iPadOS before 18). */
export const PASSKEY_UNLOCK_IOS_PRF_TOO_OLD_MESSAGE =
  "Vault passkey unlock is not available on this iPhone or iPad version. It requires iOS or iPadOS 18 or later. Use your vault password or recovery phrase, or unlock from a desktop browser where vault passkey unlock is configured.";

export const PASSKEY_VAULT_UNLOCK_TEST_SUCCEEDED_MESSAGE =
  "Passkey test succeeded. This browser returned PRF output for your vault unlock passkey.";

export const PASSKEY_VAULT_UNLOCK_ACCOUNT_LOGIN_NOTE =
  "Use a compatible passkey to unlock your vault after you sign in. This is separate from account passkey sign-in and requires WebAuthn PRF support from your browser and passkey provider.";

/** Shown when passkey envelope wrap needs re-unlock to cache inner key material. */
export const PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE =
  "Lock your vault, unlock it again with your vault password or recovery phrase on this device, then set up passkey vault unlock.";

export const PASSKEY_VAULT_UNLOCK_READONLY_HEADLINE =
  "Passkey vault unlock is enabled, but cannot be managed in this browser.";

export const PASSKEY_VAULT_UNLOCK_READONLY_MESSAGE =
  "This browser supports passkeys for sign-in, but it does not report PRF support. PRF is required to test, replace, or disable passkey vault unlock. Use a PRF-compatible browser where vault unlock was configured, or unlock with your vault password or recovery phrase.";

export const PASSKEY_PLATFORM_AUTHENTICATOR_CONFLICT_MESSAGE =
  "This passkey already exists on this device. Remove it from your password manager or use a different passkey.";
