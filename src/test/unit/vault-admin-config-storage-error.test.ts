import { describe, expect, it } from "vitest";
import {
  formatVaultAdminConfigStorageError,
  isMissingVaultAdminConfigOverridesTable,
} from "@/modules/vault/repositories/vault-admin-config-storage-error";

describe("vault-admin-config-storage-error", () => {
  it("detects a missing vault admin config overrides table", () => {
    const error = Object.assign(new Error("Failed query: select from vault_admin_config_overrides"), {
      cause: Object.assign(
        new Error('relation "note_kanban_boards" does not exist'),
        { code: "42P01" }
      ),
    });
    expect(isMissingVaultAdminConfigOverridesTable(error)).toBe(false);

    const missing = Object.assign(new Error("Failed query"), {
      cause: Object.assign(
        new Error('relation "vault_admin_config_overrides" does not exist'),
        { code: "42P01" }
      ),
    });
    expect(isMissingVaultAdminConfigOverridesTable(missing)).toBe(true);
  });

  it("formats connection errors with migration hints", () => {
    const error = Object.assign(
      new Error('Failed query: select "key", "value", "updated_at" from "vault_admin_config_overrides"'),
      {
        cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5435"), {
          code: "ECONNREFUSED",
        }),
      }
    );

    expect(formatVaultAdminConfigStorageError(error, "load")).toContain("ECONNREFUSED");
    expect(formatVaultAdminConfigStorageError(error, "load")).toContain("npm run db:migrate");
  });
});
