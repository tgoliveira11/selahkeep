import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { describe, it, expect } from "vitest";

const SRC_ROOT = join(process.cwd(), "src");
const GUARD_FILE = "webauthn-challenge-api-guard.test.ts";
const FORBIDDEN = ["findValid", "Challenge"].join("");

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("deprecated WebAuthn challenge API guard", () => {
  it("does not allow deprecated challenge lookup in src/**/*.ts(x)", () => {
    const offenders = collectSourceFiles(SRC_ROOT).filter((filePath) => {
      if (basename(filePath) === GUARD_FILE) {
        return false;
      }
      const content = readFileSync(filePath, "utf8");
      return content.includes(FORBIDDEN);
    });

    expect(offenders, offenders.map((p) => relative(process.cwd(), p)).join(", ")).toEqual([]);
  });
});
