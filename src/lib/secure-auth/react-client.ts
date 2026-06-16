"use client";

export {
  ConfirmDialog,
  defaultSignOutAccount,
  getPasskeyLoginUnsupportedMessage,
  isPasskeyLoginSupported,
  buildPasskeyLoginOptionsPayload,
  usePasswordManagerFormSubmit,
} from "./react-client-reexports";

export {
  buildPasskeyLoginOutcomeKey,
  signInWithPasskey,
  type PasskeyLoginOutcome,
  type SignInWithPasskeyOptions,
} from "@/features/passkey/sign-in-with-passkey";
