import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { globSync } from "glob";

const ROOT = process.cwd();

const REMOVED_PATHS = [
  "src/app/(vault)/letters",
  "src/app/api/letters",
  "src/modules/letters",
  "src/features/letters",
  "src/components/letters",
  "src/lib/crypto-client/letters.ts",
  "src/lib/api-client/letters.ts",
  "src/lib/validation/letters.ts",
  "src/server/services/letter-service.ts",
  "src/server/repositories/letter-repository.ts",
  "docs/LETTERS_TO_NOTES_MIGRATION.md",
];

describe("no active letters domain", () => {
  it("removed letters routes, modules, and crypto paths", () => {
    for (const relative of REMOVED_PATHS) {
      expect(existsSync(join(ROOT, relative)), `${relative} should not exist`).toBe(false);
    }
  });

  it("source tree has no letters API routes", () => {
    const apiRoutes = globSync("src/app/api/**/route.ts", { cwd: ROOT });
    expect(apiRoutes.some((p) => p.includes("/letters"))).toBe(false);
  });

  it("source tree has no letters pages", () => {
    const pages = globSync("src/app/**/page.tsx", { cwd: ROOT });
    expect(pages.some((p) => p.includes("/letters"))).toBe(false);
  });

  it("app schema does not export letters table", () => {
    const schema = readFile("src/lib/db/app-schema.ts");
    expect(schema).not.toMatch(/export const letters\b/);
    expect(schema).toContain("export const notes");
  });

  it("next.config has no letters redirects", () => {
    const config = readFile("next.config.ts");
    expect(config).not.toContain("/letters");
  });
});

function readFile(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf-8");
}
