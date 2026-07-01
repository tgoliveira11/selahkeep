import { VaultAdminEnvTemplatePageClient } from "@/features/vault/vault-admin-page-clients";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminEnvTemplatePageClient config={getVaultAdminConfig()} />;
}
