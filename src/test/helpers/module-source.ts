import { readFileSync } from "node:fs";
import { join } from "node:path";

const SHIM_RE = /Phase 1 modular monolith shim[\s\S]*?export \* from "(@\/[^"]+)"/;

/**
 * Read source for static security/boundary tests.
 * Follows Phase 1 re-export shims to the implementation under src/modules.
 */
export function readModuleSource(relativePath: string): string {
  const absolute = join(process.cwd(), relativePath);
  const content = readFileSync(absolute, "utf8");
  const match = content.match(SHIM_RE);
  if (!match) {
    return content;
  }
  const modulePath = `${match[1]!.replace("@/", "src/")}.ts`;
  return readFileSync(join(process.cwd(), modulePath), "utf8");
}
