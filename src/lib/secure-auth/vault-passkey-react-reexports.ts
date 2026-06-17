/** Re-export package react/client helpers without going through the app alias. */
export {
  ConfirmDialog,
  TurnstileCaptcha,
  defaultSignOutAccount,
  getPasskeyLoginUnsupportedMessage,
  isPasskeyLoginSupported,
  buildPasskeyLoginOptionsPayload,
  buildPasskeyLoginOutcomeKey,
  usePasswordManagerFormSubmit,
} from "../../../node_modules/@tgoliveira/secure-auth/dist/react/client.js";
