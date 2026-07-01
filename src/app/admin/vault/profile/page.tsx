import Link from "next/link";
import { VaultAdminProfilePage } from "@tgoliveira/vault-core/react";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminProfilePage config={getVaultAdminConfig()} LinkComponent={Link} />;
}
