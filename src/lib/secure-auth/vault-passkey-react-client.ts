"use client";

export {
  ConfirmDialog,
  TurnstileCaptcha,
  defaultSignOutAccount,
  getPasskeyLoginUnsupportedMessage,
  isPasskeyLoginSupported,
  buildPasskeyLoginOptionsPayload,
  buildPasskeyLoginOutcomeKey,
  usePasswordManagerFormSubmit,
} from "./vault-passkey-react-reexports";

export {
  signInWithPasskey,
  type PasskeyLoginOutcome,
  type SignInWithPasskeyOptions,
} from "@/features/passkey/passkey-login-with-vault-unlock";
