import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const FORBIDDEN_IMPORTS = [
  '@/lib/db"',
  "@/lib/db'",
  '@/server/repositories',
  "drizzle-orm",
  "postgres",
];

function getClientFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!entry.includes("api") && entry !== "server") {
        files.push(...getClientFiles(full));
      }
    } else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("frontend does not import database clients", () => {
  const clientDirs = [
    join(process.cwd(), "src/app/(vault)"),
    join(process.cwd(), "src/app/(auth)"),
    join(process.cwd(), "src/components"),
    join(process.cwd(), "src/features"),
    join(process.cwd(), "src/lib/crypto-client"),
    join(process.cwd(), "src/lib/api-client"),
  ];

  for (const dir of clientDirs) {
    it(`no forbidden imports in ${dir.split("src/")[1]}`, () => {
      let files: string[] = [];
      try {
        files = getClientFiles(dir);
      } catch {
        return;
      }

      for (const file of files) {
        const content = readFileSync(file, "utf-8");
        for (const forbidden of FORBIDDEN_IMPORTS) {
          expect(content, `${file} imports ${forbidden}`).not.toContain(forbidden);
        }
      }
    });
  }
});
