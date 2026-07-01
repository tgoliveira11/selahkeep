import { getVaultAdminConfig } from "@/lib/env/vault-from-env";
import { VaultSetupPage } from "@/features/vault/vault-setup-page";

export default function VaultSetupRoutePage() {
  const vaultPasswordPolicy = getVaultAdminConfig().passwordPolicy;
  return <VaultSetupPage vaultPasswordPolicy={vaultPasswordPolicy} />;
}
