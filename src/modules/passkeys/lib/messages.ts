export const PASSKEY_PRF_UNAVAILABLE_HEADLINE =
  "This browser or passkey provider does not support vault unlock with passkey. Your private letters were not linked to this passkey. Please use a recovery code or another trusted device to recover your letters.";

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
  "Signed in with passkey. Your private letters are unlocked on this device.";

export const PASSKEY_LOGIN_VAULT_LOCKED_MESSAGE =
  "You are signed in. Your private letters are still locked because this passkey is not set up to unlock your vault.";

export const PASSKEY_LOGIN_PRF_UNAVAILABLE_MESSAGE =
  "This passkey signed you in, but this browser or passkey provider does not support unlocking your private letters with it.";

export const PASSKEY_LOGIN_CANCELLED_MESSAGE = "Passkey sign-in was cancelled.";

export const PASSKEY_LOGIN_UNSUPPORTED_MESSAGE =
  "This browser does not support passkey sign-in.";
