import { VaultAdminPasswordPolicyPageClient } from "@/features/vault/vault-admin-page-clients";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminPasswordPolicyPageClient config={getVaultAdminConfig()} />;
}
