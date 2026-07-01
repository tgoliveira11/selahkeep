import Link from "next/link";
import { VaultAdminPanelPage } from "@tgoliveira/vault-core/react";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminPanelPage config={getVaultAdminConfig()} LinkComponent={Link} />;
}
