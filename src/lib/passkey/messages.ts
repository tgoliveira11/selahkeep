export const PASSKEY_PRF_UNAVAILABLE_HEADLINE =
  "This browser or passkey provider does not support vault unlock with passkey. Your vault was not linked to this passkey. Use your vault password or recovery phrase to unlock.";

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

export const PASSKEY_LOGIN_VAULT_UNLOCKED_MESSAGE =
  "Signed in with passkey. Your private notes are unlocked on this device.";

export const PASSKEY_LOGIN_VAULT_LOCKED_MESSAGE =
  "You are signed in, but your vault is still locked because this passkey is not set up to unlock it.";

export const PASSKEY_LOGIN_PRF_UNAVAILABLE_MESSAGE =
  "This passkey signed you in, but this browser or passkey provider cannot unlock your vault with it yet.";

export const PASSKEY_LOGIN_CANCELLED_MESSAGE = "Passkey sign-in was cancelled.";

export const PASSKEY_LOGIN_UNSUPPORTED_MESSAGE =
  "This browser does not support passkey sign-in.";

export const PASSKEY_VAULT_UNLOCK_ENABLED_MESSAGE =
  "Passkey vault unlock is now enabled for this passkey.";

export const PASSKEY_VAULT_UNLOCK_DISABLED_MESSAGE =
  "Passkey vault unlock was disabled. This passkey can still sign you in.";

export const PASSKEY_UNLOCK_NO_ENVELOPE_MESSAGE =
  "You are signed in, but this passkey is not set up to unlock your vault.";

export const PASSKEY_UNLOCK_PRF_UNAVAILABLE_MESSAGE =
  "This browser or passkey provider cannot unlock your vault with passkey yet.";

export const PASSKEY_UNLOCK_DECRYPT_FAILED_MESSAGE =
  "We could not unlock your vault with this passkey. Use your vault password or recovery phrase.";
