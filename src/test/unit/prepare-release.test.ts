import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const SCRIPT = join(ROOT, "scripts/prepare-release.mjs");

function runPrepare(args: string[]) {
  const stdout = execFileSync("node", [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return JSON.parse(stdout.trim()) as {
    changed: boolean;
    version: string | null;
    recovery: boolean;
    releaseNotes: string;
    error?: string;
  };
}

describe("prepare-release.mjs", () => {
  it("dry-run patch bump reads unreleased notes without writing files", () => {
    const result = runPrepare(["--version=patch", "--dry-run"]);
    expect(result.error).toBeUndefined();
    expect(result.recovery).toBe(false);
    expect(result.changed).toBe(true);
    expect(result.version).toBe("0.1.1");
    expect(result.releaseNotes).toContain("Mobile: voice model download OOM");
    expect(readFileSync(join(ROOT, "package.json"), "utf8")).toContain('"version": "0.1.0"');
  });
});
