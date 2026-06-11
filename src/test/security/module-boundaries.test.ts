import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type BoundaryRule = {
  module: string;
  forbidden: RegExp[];
};

const MODULE_ROOT = join(process.cwd(), "src/modules");

const RULES: BoundaryRule[] = [
  {
    module: "auth",
    forbidden: [/@\/modules\/vault/, /@\/modules\/letters/, /crypto-client\/letters/],
  },
  {
    module: "account",
    forbidden: [/@\/modules\/letters/, /letter-service/, /letter-repository/],
  },
  {
    module: "sessions",
    forbidden: [
      /@\/modules\/vault/,
      /crypto-client/,
      /trusted-device-repository/,
      /trusted-device-service/,
    ],
  },
  {
    module: "two-factor",
    forbidden: [/@\/modules\/vault/, /crypto-client/, /User Vault Key/i],
  },
  {
    module: "email",
    forbidden: [/@\/modules\/vault/, /@\/modules\/letters/, /encryptedTitle|encryptedBody/],
  },
  {
    module: "audit",
    forbidden: [/@\/modules\/letters/, /encryptedTitle|encryptedBody/],
  },
  {
    module: "rate-limit",
    forbidden: [/@\/modules\/letters/, /encryptedTitle|encryptedBody/],
  },
  {
    module: "security",
    forbidden: [/@\/modules\/letters/, /@\/modules\/vault\/services/],
  },
  {
    module: "ui",
    forbidden: [/@\/modules\/letters/, /@\/modules\/vault\/services/, /@\/lib\/db/],
  },
  {
    module: "vault",
    forbidden: [/@\/modules\/letters\/components/, /letter-card/],
  },
];

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("module boundary imports (Phase 1)", () => {
  for (const rule of RULES) {
    it(`${rule.module} must not import forbidden modules`, () => {
      const moduleDir = join(MODULE_ROOT, rule.module);
      const files = collectSourceFiles(moduleDir);
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const source = readFileSync(file, "utf8");
        for (const pattern of rule.forbidden) {
          expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
        }
      }
    });
  }

  it("letters module must not import database clients directly in components", () => {
    const lettersDir = join(MODULE_ROOT, "letters");
    if (!statSync(lettersDir).isDirectory()) return;
    const files = collectSourceFiles(lettersDir).filter((f) => f.includes("/components/"));
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/@\/lib\/db/);
    }
  });
});
