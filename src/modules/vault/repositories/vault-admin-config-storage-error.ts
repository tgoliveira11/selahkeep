import { collectPostgresErrorMessages, isMissingRelationError } from "@/lib/db/missing-relation-error";

const VAULT_ADMIN_CONFIG_OVERRIDES_TABLE = "vault_admin_config_overrides";

export function isMissingVaultAdminConfigOverridesTable(error: unknown): boolean {
  return isMissingRelationError(error, VAULT_ADMIN_CONFIG_OVERRIDES_TABLE);
}

export function formatVaultAdminConfigStorageError(
  error: unknown,
  operation: "load" | "save" | "delete"
): string {
  const detail = collectPostgresErrorMessages(error).trim();
  const hints = [
    "Ensure Docker Postgres is running (`docker compose up -d`).",
    "Run `npm run db:migrate` then `npm run db:check-vault-admin`.",
    "Confirm the dev server uses the same DATABASE_URL as migrations (see `.env.local`).",
  ].join(" ");

  if (!detail) {
    return `Vault admin config ${operation} failed. ${hints}`;
  }

  if (/ECONNREFUSED/i.test(detail)) {
    return `Vault admin config ${operation} failed: cannot connect to PostgreSQL (${detail}). ${hints}`;
  }

  if (isMissingVaultAdminConfigOverridesTable(error)) {
    return `Vault admin config ${operation} failed: table "${VAULT_ADMIN_CONFIG_OVERRIDES_TABLE}" is missing. ${hints}`;
  }

  return `Vault admin config ${operation} failed: ${detail}. ${hints}`;
}

export class VaultAdminConfigStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VaultAdminConfigStorageError";
  }
}
