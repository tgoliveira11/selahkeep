"use client";

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  PageShell,
  useUiPaths,
} from "@tgoliveira/secure-auth/react";
import {
  OUTPOST_HUB_LINKS,
  SECURE_AUTH_HUB_LINKS,
  VAULT_HUB_LINKS,
  type AdminHubLink,
} from "@/lib/admin/admin-hub-links";

function AdminHubLinkGrid({ base, links }: { base: string; links: AdminHubLink[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <Link key={link.key} href={`${base}${link.suffix}`} className="block">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-base">{link.label}</CardTitle>
              <CardDescription className="text-sm">{link.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function AdminHubSection({
  title,
  description,
  base,
  links,
}: {
  title: string;
  description: string;
  base: string;
  links: AdminHubLink[];
}) {
  return (
    <section className="mb-10 last:mb-0">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      <AdminHubLinkGrid base={base} links={links} />
    </section>
  );
}

export function AdminOverviewPage({
  outpostAdminBase,
  vaultAdminBase,
}: {
  outpostAdminBase: string;
  vaultAdminBase: string;
}) {
  const resolved = useUiPaths();
  const secureAuthBase = resolved.adminPanel ?? "/admin";

  return (
    <PageShell width="wide">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Admin</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Platform administration for account auth, Outpost email, and vault configuration.
        </p>
      </div>

      <AdminHubSection
        title="Account & auth"
        description="Users, registration, locks, API keys, and secure-auth runtime config."
        base={secureAuthBase}
        links={SECURE_AUTH_HUB_LINKS}
      />

      <AdminHubSection
        title="Outpost"
        description="Transactional email queue, worker, config overrides, and observability."
        base={outpostAdminBase}
        links={OUTPOST_HUB_LINKS}
      />

      <AdminHubSection
        title="Vault"
        description="Zero-knowledge vault policy, session rules, and runtime configuration."
        base={vaultAdminBase}
        links={VAULT_HUB_LINKS}
      />
    </PageShell>
  );
}
