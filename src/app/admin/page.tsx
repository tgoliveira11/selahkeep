import { AdminOverviewPage } from "@/components/admin-overview-page";
import { buildOutpostEnvConfig } from "@/lib/env/outpost-from-env";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function AdminPage() {
  const { adminPath: outpostAdminBase } = buildOutpostEnvConfig();
  const { basePath: vaultAdminBase } = getVaultAdminConfig();

  return (
    <AdminOverviewPage outpostAdminBase={outpostAdminBase} vaultAdminBase={vaultAdminBase} />
  );
}
