export {
  ENCRYPTION_VERSION,
  ENCRYPTION_ALG,
  VAULT_CRYPTO_VERSION,
  DEFAULT_VAULT_AUTO_LOCK_MINUTES,
} from "@tgoliveira/vault-core";

export const VAULT_VERSION = "vault-v1";
export const VAULT_VERSION_V2 = "vault-v2";

export {
  SELAHKEEP_VAULT_PROFILE,
  SELAHKEEP_PRF_SALT_PREFIX,
} from "../selahkeep-profile";

import { SELAHKEEP_VAULT_PROFILE, SELAHKEEP_PRF_SALT_PREFIX } from "../selahkeep-profile";

/** @deprecated Import SELAHKEEP_VAULT_PROFILE.aadContextVault instead */
export const AAD_CONTEXT_VAULT = SELAHKEEP_VAULT_PROFILE.aadContextVault;

/** @deprecated Import SELAHKEEP_VAULT_PROFILE.aadContextEnvelope instead */
export const AAD_CONTEXT_ENVELOPE = SELAHKEEP_VAULT_PROFILE.aadContextEnvelope;

/** @deprecated Import SELAHKEEP_PRF_SALT_PREFIX instead */
export const PRF_SALT_PREFIX = SELAHKEEP_PRF_SALT_PREFIX;
