export { createUserVaultKey, createUserVaultKey as generateUserVaultKey } from "@tgoliveira/vault-core";
export {
  getSessionVaultKey,
  setSessionVaultKey,
  lockVault,
  isVaultUnlocked,
  clearVaultClientState as clearVaultCoreClientState,
} from "@tgoliveira/vault-core/browser";
