import { VaultAdminConfigPageClient } from "@/features/vault/vault-admin-page-clients";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";
import { listVaultAdminConfigOverrideRecords } from "@/modules/vault/repositories/vault-admin-config-override-repository";

export default async function Page() {
  const overrides = await listVaultAdminConfigOverrideRecords();
  return (
    <VaultAdminConfigPageClient
      config={getVaultAdminConfig(process.env, overrides)}
      adminOverrides={overrides}
    />
  );
}
