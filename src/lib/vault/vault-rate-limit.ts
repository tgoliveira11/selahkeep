import {
  createVaultApiRateLimiterFromAdminConfig,
  createVaultUnlockRateLimiterFromAdminConfig,
  type VaultApiRateLimiter,
  type VaultUnlockRateLimiter,
} from "@tgoliveira/vault-core";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

let unlockLimiter: VaultUnlockRateLimiter | null = null;
let apiLimiter: VaultApiRateLimiter | null = null;

export function getVaultUnlockRateLimiter(): VaultUnlockRateLimiter {
  if (!unlockLimiter) {
    unlockLimiter = createVaultUnlockRateLimiterFromAdminConfig(getVaultAdminConfig());
  }
  return unlockLimiter;
}

export function getVaultApiRateLimiter(): VaultApiRateLimiter {
  if (!apiLimiter) {
    apiLimiter = createVaultApiRateLimiterFromAdminConfig(getVaultAdminConfig());
  }
  return apiLimiter;
}

/** @internal tests */
export function resetVaultRateLimitersForTests(): void {
  unlockLimiter = null;
  apiLimiter = null;
}
