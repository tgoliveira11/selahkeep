import { VAULT_ADMIN_SECTIONS } from "@tgoliveira/vault-core";

export type AdminHubLink = {
  key: string;
  label: string;
  description: string;
  suffix: string;
};

export const SECURE_AUTH_HUB_LINKS: AdminHubLink[] = [
  {
    key: "overview",
    label: "Overview",
    description: "Admin home — account auth, Outpost email, and vault configuration.",
    suffix: "",
  },
  {
    key: "users",
    label: "Users",
    description: "Manage user accounts, roles, and statuses.",
    suffix: "/users",
  },
  {
    key: "waitlist",
    label: "Waitlist",
    description: "Review and approve pending registrations.",
    suffix: "/waitlist",
  },
  {
    key: "invites",
    label: "Invites",
    description: "Manage invite codes and quotas.",
    suffix: "/invites",
  },
  {
    key: "locks",
    label: "Locks",
    description: "View frozen and locked accounts; unlock users.",
    suffix: "/locks",
  },
  {
    key: "api-keys",
    label: "API Keys",
    description: "Create and revoke machine-to-machine API keys.",
    suffix: "/api-keys",
  },
  {
    key: "config",
    label: "Config",
    description: "Override secure-auth runtime configuration values.",
    suffix: "/config",
  },
];

export const OUTPOST_HUB_LINKS: AdminHubLink[] = [
  {
    key: "outpost",
    label: "Outpost",
    description: "Transactional email outbox overview.",
    suffix: "",
  },
  {
    key: "queue",
    label: "Email queue",
    description: "Inspect queued messages and run the send worker manually.",
    suffix: "/queue",
  },
  {
    key: "config",
    label: "Email config",
    description: "View and override Outpost runtime settings.",
    suffix: "/config",
  },
  {
    key: "observability",
    label: "Observability",
    description: "Queue depth, worker activity, and OpenTelemetry metric catalog.",
    suffix: "/observability",
  },
];

export const VAULT_SECTION_SUFFIX = {
  config: "/config",
  envTemplate: "/env-template",
  cryptoPolicy: "/crypto-policy",
  profile: "/profile",
  session: "/session",
  passwordPolicy: "/password-policy",
  security: "/security",
} as const;

export const VAULT_HUB_LINKS: AdminHubLink[] = [
  {
    key: "vault",
    label: "Vault",
    description: "Zero-knowledge vault admin overview and policy screens.",
    suffix: "",
  },
  ...VAULT_ADMIN_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    description: section.description,
    suffix: VAULT_SECTION_SUFFIX[section.key as keyof typeof VAULT_SECTION_SUFFIX],
  })),
];

/** Nav labels only — shared by the sticky admin header. */
export function toNavItems(links: AdminHubLink[]): { suffix: string; label: string }[] {
  return links.map(({ suffix, label }) => ({ suffix, label }));
}

export const SECURE_AUTH_NAV_ITEMS = toNavItems(SECURE_AUTH_HUB_LINKS);
export const OUTPOST_NAV_ITEMS = toNavItems(OUTPOST_HUB_LINKS);
export const VAULT_NAV_ITEMS = toNavItems(VAULT_HUB_LINKS);
