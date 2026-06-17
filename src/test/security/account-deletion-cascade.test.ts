import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_PATH = join(process.cwd(), "src/lib/db/app-schema.ts");

const PRODUCT_TABLES_WITH_USER_CASCADE = [
  "passkeyCredentials",
  "userVaults",
  "vaultEnvelopes",
  "trustedDevices",
] as const;

describe("account deletion cascade", () => {
  it("product tables reference users with ON DELETE CASCADE", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8");

    for (const table of PRODUCT_TABLES_WITH_USER_CASCADE) {
      const section = extractTableSection(schema, table);
      expect(section, `${table} should exist`).toBeTruthy();
      expect(section).toMatch(/references\(\(\)\s*=>\s*users\.id,\s*\{\s*onDelete:\s*"cascade"\s*\}\)/);
    }
  });

  it("notes reference user_vaults with ON DELETE CASCADE", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    const notesSection = extractTableSection(schema, "notes");
    expect(notesSection).toMatch(
      /references\(\(\)\s*=>\s*userVaults\.id,\s*\{\s*onDelete:\s*"cascade"\s*\}\)/
    );
  });

  it("account DELETE route delegates to secure-auth package handler", () => {
    const accountRoute = readFileSync(
      join(process.cwd(), "src/app/api/account/route.ts"),
      "utf8"
    );
    expect(accountRoute).toContain("secureAuth.routes.account.DELETE");
    expect(accountRoute).not.toMatch(/DELETE[\s\S]*userVaults/);
  });

  it("deleting a user cascades vault then notes via FK chain", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    // users → user_vaults (cascade) → notes (cascade via vault_id)
    expect(schema).toMatch(/userVaults[\s\S]*onDelete:\s*"cascade"/);
    expect(schema).toMatch(/notes[\s\S]*userVaults\.id[\s\S]*onDelete:\s*"cascade"/);
  });
});

function extractTableSection(schema: string, tableName: string): string {
  const start = schema.indexOf(`export const ${tableName}`);
  if (start < 0) return "";
  const nextExport = schema.indexOf("export const ", start + 1);
  return nextExport < 0 ? schema.slice(start) : schema.slice(start, nextExport);
}
