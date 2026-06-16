/** Re-export package react/client helpers without going through the app alias. */
export {
  ConfirmDialog,
  defaultSignOutAccount,
  getPasskeyLoginUnsupportedMessage,
  isPasskeyLoginSupported,
  buildPasskeyLoginOptionsPayload,
  usePasswordManagerFormSubmit,
} from "../../../node_modules/@tgoliveira/secure-auth/dist/react/client.js";
