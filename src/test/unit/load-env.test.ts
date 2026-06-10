import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadEnvFiles", () => {
  let cwd: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "letters-env-"));
    process.chdir(cwd);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(cwd, { recursive: true, force: true });
    delete process.env.TEST_LOAD_ENV_KEY;
  });

  it("loads unset variables from .env.local", async () => {
    writeFileSync(join(cwd, ".env.local"), 'TEST_LOAD_ENV_KEY="from-file"\n', "utf-8");
    const { loadEnvFiles } = await import("@/lib/load-env");
    loadEnvFiles();
    expect(process.env.TEST_LOAD_ENV_KEY).toBe("from-file");
  });

  it("does not override existing environment variables", async () => {
    process.env.TEST_LOAD_ENV_KEY = "existing";
    writeFileSync(join(cwd, ".env"), "TEST_LOAD_ENV_KEY=from-file\n", "utf-8");
    const { loadEnvFiles } = await import("@/lib/load-env");
    loadEnvFiles();
    expect(process.env.TEST_LOAD_ENV_KEY).toBe("existing");
  });
});
