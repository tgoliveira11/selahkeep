import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

const forbiddenPatterns = [
  /LTG Vault/i,
  /Letters to God/i,
  /Cartas para Deus/i,
  /letters, prayers, reflections/i,
  /Selahkeep/,
  /Selah Keep/,
];

const allowedPathFragments = [
  "TRUSTED_DEVICES_REMOVAL.md",
  "no-old-branding.test.ts",
  "brand.ts",
];

const allowedDisclaimerPatterns = [
  /Former working name: LTG Vault/gi,
  /former working name: LTG Vault/gi,
];

const scanRoots = ["src", "docs", ".cursor", "AGENTS.md", "README.md", "ARCHITECTURE.md", "SECURITY.md"];

function listFiles(target: string, acc: string[] = []): string[] {
  const full = path.join(root, target);
  if (!existsSync(full)) return acc;

  if (statSync(full).isFile()) {
    if (/\.(ts|tsx|md|yaml|json|svg|css|example)$/.test(target)) {
      acc.push(full);
    }
    return acc;
  }

  for (const entry of readdirSync(full, { withFileTypes: true })) {
    listFiles(path.join(target, entry.name), acc);
  }
  return acc;
}

function isAllowed(filePath: string): boolean {
  return allowedPathFragments.some((fragment) => filePath.includes(fragment));
}

function stripAllowedDisclaimers(content: string): string {
  let stripped = content;
  for (const pattern of allowedDisclaimerPatterns) {
    stripped = stripped.replace(pattern, "");
  }
  return stripped;
}

describe("no old branding guard", () => {
  it("active source and docs do not use deprecated product branding", () => {
    const files = scanRoots.flatMap((target) => listFiles(target));
    const violations: string[] = [];

    for (const file of files) {
      if (isAllowed(file)) continue;
      const content = stripAllowedDisclaimers(readFileSync(file, "utf8"));
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push(`${path.relative(root, file)} matches ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
