import Link from "next/link";
import { VaultAdminPasswordPolicyPage } from "@tgoliveira/vault-core/react";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminPasswordPolicyPage config={getVaultAdminConfig()} LinkComponent={Link} />;
}
