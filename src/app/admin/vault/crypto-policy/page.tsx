import Link from "next/link";
import { VaultAdminCryptoPolicyPage } from "@tgoliveira/vault-core/react";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";

export default function Page() {
  return <VaultAdminCryptoPolicyPage config={getVaultAdminConfig()} LinkComponent={Link} />;
}
