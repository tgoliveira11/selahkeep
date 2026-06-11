import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MODULE_ROOT = join(process.cwd(), "src/modules");

const UTILITY_CORE_DIRS = [
  "security",
  "email/core",
  "email/templates",
  "rate-limit/core",
  "rate-limit/adapters",
  "audit/core",
  "ui/primitives",
  "ui/lib",
] as const;

const FORBIDDEN_PRODUCT_IMPORTS = [
  /@\/modules\/vault/,
  /@\/modules\/letters/,
  /crypto-client\/letters/,
];

const FORBIDDEN_UI_PRODUCT_IMPORTS = [
  /@\/modules\/auth/,
  /@\/modules\/account/,
  /@\/modules\/sessions/,
  /@\/modules\/two-factor/,
  /@\/modules\/passkeys/,
  /@\/modules\/vault/,
  /@\/modules\/letters/,
  /@\/lib\/db/,
];

function collectSourceFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "components" && full.includes(`${join("ui", "components")}`)) {
        continue;
      }
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      if (entry.includes("shim")) continue;
      const content = readFileSync(full, "utf8");
      if (content.includes("utility extraction shim")) continue;
      files.push(full);
    }
  }
  return files;
}

describe("utility module boundaries (Phase 2)", () => {
  for (const relativeDir of UTILITY_CORE_DIRS) {
    it(`${relativeDir} must not import vault or letters`, () => {
      const dir = join(MODULE_ROOT, relativeDir);
      const files = collectSourceFiles(dir);
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const source = readFileSync(file, "utf8");
        for (const pattern of FORBIDDEN_PRODUCT_IMPORTS) {
          expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
        }
      }
    });
  }

  it("ui primitives must not import product modules", () => {
    const dir = join(MODULE_ROOT, "ui/primitives");
    const files = collectSourceFiles(dir);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN_UI_PRODUCT_IMPORTS) {
        expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("utility cores must not reference private letter sentinel content", () => {
    const sentinel = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";
    for (const relativeDir of UTILITY_CORE_DIRS) {
      const dir = join(MODULE_ROOT, relativeDir);
      for (const file of collectSourceFiles(dir)) {
        const source = readFileSync(file, "utf8");
        expect(source).not.toContain(sentinel);
      }
    }
  });
});
