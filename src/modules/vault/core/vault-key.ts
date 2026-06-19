export { createUserVaultKey, createUserVaultKey as generateUserVaultKey } from "@tgoliveira/vault-core";
export {
  clearVaultCoreClientState,
  getSessionVaultKey,
  getUserVaultKey,
  hasUnlockedVaultSession,
  isVaultUnlocked,
  lockVault,
  setSessionVaultKey,
} from "@/lib/crypto-client/vault-session";
