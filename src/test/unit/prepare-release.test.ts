import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCRIPT = join(REPO_ROOT, "scripts/prepare-release.mjs");

function runPrepareIn(dir: string, args: string[]) {
  const { stdout, status } = spawnSync("node", [SCRIPT, ...args], {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      PREPARE_RELEASE_ROOT: dir,
    },
  });
  const output = (stdout ?? "").trim();
  if (!output) {
    throw new Error(`prepare-release produced no stdout (exit ${status})`);
  }
  return JSON.parse(output) as {
    changed: boolean;
    version: string | null;
    recovery: boolean;
    releaseNotes: string;
    error?: string;
  };
}

function writeFixture(
  dir: string,
  options: {
    version?: string;
    unreleased?: string;
    releasedVersion?: string;
    releasedBody?: string;
  } = {}
) {
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify({ name: "letters-to-god", version: options.version ?? "0.1.0", private: true }, null, 2)}\n`,
    "utf8"
  );

  const unreleased = options.unreleased ?? "### Fixed\n\n- Example change\n";
  const released =
    options.releasedVersion && options.releasedBody
      ? `\n## [${options.releasedVersion}] - 2026-01-01\n\n${options.releasedBody}\n`
      : "";

  writeFileSync(
    join(dir, "CHANGELOG.md"),
    `# Changelog\n\n## [Unreleased]\n\n${unreleased}${released}`,
    "utf8"
  );
}

describe("prepare-release.mjs", () => {
  let workDir = "";

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "selahkeep-release-"));
  });

  afterEach(() => {
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  });

  it("dry-run patch bump reads unreleased notes without writing files", () => {
    writeFixture(workDir);
    const result = runPrepareIn(workDir, ["--version=patch", "--dry-run"]);
    expect(result.error).toBeUndefined();
    expect(result.recovery).toBe(false);
    expect(result.changed).toBe(true);
    expect(result.version).toBe("0.1.1");
    expect(result.releaseNotes).toContain("Example change");
    expect(JSON.parse(readFileSync(join(workDir, "package.json"), "utf8")).version).toBe("0.1.0");
  });

  it("recovery mode reuses current version when unreleased is empty", () => {
    writeFixture(workDir, {
      version: "0.2.0",
      unreleased: "",
      releasedVersion: "0.2.0",
      releasedBody: "### Fixed\n\n- Shipped fix\n",
    });
    const result = runPrepareIn(workDir, ["--version=auto", "--dry-run"]);
    expect(result.error).toBeUndefined();
    expect(result.recovery).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.version).toBe("0.2.0");
    expect(result.releaseNotes).toContain("Shipped fix");
  });

  it("fails when unreleased is empty and explicit bump is requested", () => {
    writeFixture(workDir, { unreleased: "" });
    const result = runPrepareIn(workDir, ["--version=minor", "--dry-run"]);
    expect(result.error).toMatch(/\[Unreleased\] has no release notes/);
  });
});
