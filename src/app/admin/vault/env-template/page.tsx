import Link from "next/link";
import { VaultAdminEnvTemplatePage } from "@tgoliveira/vault-core/react";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminEnvTemplatePage config={getVaultAdminConfig()} LinkComponent={Link} />;
}
