import {
  buildVaultAdminConfigFromEnv,
  type VaultAdminConfig,
  type VaultCryptoProfile,
} from "@tgoliveira/vault-core";
import {
  SELAHKEEP_PRF_SALT_PREFIX,
  SELAHKEEP_VAULT_PROFILE,
} from "@/modules/vault/selahkeep-profile";
import { PRODUCT_NAME } from "@/lib/marketing/brand";

export const vaultCryptoProfile: VaultCryptoProfile = SELAHKEEP_VAULT_PROFILE;

export function getVaultAdminConfig(
  env: NodeJS.ProcessEnv = process.env,
  adminOverrides?: Record<string, unknown>
): VaultAdminConfig {
  return buildVaultAdminConfigFromEnv({
    env,
    profile: vaultCryptoProfile,
    prfSaltPrefix: env.VAULT_PRF_SALT_PREFIX ?? SELAHKEEP_PRF_SALT_PREFIX,
    productName: env.APP_NAME ?? PRODUCT_NAME,
    adminOverrides,
  });
}

export function getVaultAutoLockMinutesFromConfig(
  env: NodeJS.ProcessEnv = process.env
): number {
  const config = getVaultAdminConfig(env);
  return config.session.autoLockMinutes;
}
