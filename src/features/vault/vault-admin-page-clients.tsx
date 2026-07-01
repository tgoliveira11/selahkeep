"use client";

import Link from "next/link";
import type { VaultAdminConfig } from "@tgoliveira/vault-core";
import {
  VaultAdminConfigPage,
  VaultAdminCryptoPolicyPage,
  VaultAdminEnvTemplatePage,
  VaultAdminPanelPage,
  VaultAdminPasswordPolicyPage,
  VaultAdminProfilePage,
  VaultAdminSecurityPage,
  VaultAdminSessionPage,
} from "@tgoliveira/vault-core/react";

const VAULT_ADMIN_CONFIG_API_BASE = "/api/vault";

/** Stable refs — vault-core `load` depends on `env`/`adminOverrides`; default `env = {}` in the package causes an infinite fetch loop. */
const VAULT_ADMIN_CONFIG_EMPTY_ENV: Record<string, string | undefined> = {};
const VAULT_ADMIN_CONFIG_EMPTY_OVERRIDES: Record<string, unknown> = {};

type VaultAdminPageClientProps = {
  config: VaultAdminConfig;
};

type VaultAdminConfigPageClientProps = VaultAdminPageClientProps & {
  adminOverrides?: Record<string, unknown>;
};

export function VaultAdminPanelPageClient({ config }: VaultAdminPageClientProps) {
  return <VaultAdminPanelPage config={config} LinkComponent={Link} />;
}

export function VaultAdminConfigPageClient({
  config,
  adminOverrides = VAULT_ADMIN_CONFIG_EMPTY_OVERRIDES,
}: VaultAdminConfigPageClientProps) {
  return (
    <VaultAdminConfigPage
      config={config}
      configApiBase={VAULT_ADMIN_CONFIG_API_BASE}
      adminOverrides={adminOverrides}
      env={VAULT_ADMIN_CONFIG_EMPTY_ENV}
      LinkComponent={Link}
    />
  );
}

export function VaultAdminEnvTemplatePageClient({ config }: VaultAdminPageClientProps) {
  return <VaultAdminEnvTemplatePage config={config} LinkComponent={Link} />;
}

export function VaultAdminCryptoPolicyPageClient({ config }: VaultAdminPageClientProps) {
  return <VaultAdminCryptoPolicyPage config={config} LinkComponent={Link} />;
}

export function VaultAdminProfilePageClient({ config }: VaultAdminPageClientProps) {
  return <VaultAdminProfilePage config={config} LinkComponent={Link} />;
}

export function VaultAdminSessionPageClient({ config }: VaultAdminPageClientProps) {
  return <VaultAdminSessionPage config={config} LinkComponent={Link} />;
}

export function VaultAdminPasswordPolicyPageClient({ config }: VaultAdminPageClientProps) {
  return <VaultAdminPasswordPolicyPage config={config} LinkComponent={Link} />;
}

export function VaultAdminSecurityPageClient({ config }: VaultAdminPageClientProps) {
  return <VaultAdminSecurityPage config={config} LinkComponent={Link} />;
}
