import Link from "next/link";
import { VaultAdminSecurityPage } from "@tgoliveira/vault-core/react";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminSecurityPage config={getVaultAdminConfig()} LinkComponent={Link} />;
}
