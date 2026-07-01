import Link from "next/link";
import { VaultAdminConfigPage } from "@tgoliveira/vault-core/react";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminConfigPage config={getVaultAdminConfig()} LinkComponent={Link} />;
}
