import type { VaultCryptoProfile } from "@tgoliveira/vault-core";

/** Frozen SelahKeep AAD/PRF compatibility constants (legacy envelopes omit AAD context). */
export const SELAHKEEP_VAULT_PROFILE: VaultCryptoProfile = {
  cryptoVersion: "vault-v1",
  aadContextVault: "selahkeep:vault:v1",
  aadContextEnvelope: "selahkeep:vault-envelope:v1",
  legacyVaultKeyUnlock: true,
};

/** Legacy PRF salt prefix — must not change for existing passkey vault envelopes. */
export const SELAHKEEP_PRF_SALT_PREFIX = "letters-passkey-prf-v1:";

export const SELAHKEEP_VAULT_STORAGE_PREFIX = "selahkeep-vault-";

export const SELAHKEEP_RECOVERY_KIT_FILENAME = "selahkeep-vault-recovery-kit.txt";
