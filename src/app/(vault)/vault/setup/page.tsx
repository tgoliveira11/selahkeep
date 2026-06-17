import { buildVaultPasswordPolicyFromEnv } from "@/lib/config/vault-password-policy";
import { VaultSetupPage } from "@/features/vault/vault-setup-page";

export default function VaultSetupRoutePage() {
  const vaultPasswordPolicy = buildVaultPasswordPolicyFromEnv(process.env);
  return <VaultSetupPage vaultPasswordPolicy={vaultPasswordPolicy} />;
}
