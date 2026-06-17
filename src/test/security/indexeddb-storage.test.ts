import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";

describe("IndexedDB trusted-device cleanup", () => {
  const cleanup = readFileSync(
    join(process.cwd(), "src/lib/crypto-client/vault-idb-cleanup.ts"),
    "utf-8"
  );

  it("removes legacy device secret and envelope stores on upgrade", () => {
    expect(cleanup).toContain("device_secrets");
    expect(cleanup).toContain("vault_envelopes");
    expect(cleanup).toMatch(/DB_VERSION = 3/);
    expect(cleanup).toContain("deleteObjectStore");
  });

  it("does not recreate trusted-device stores", () => {
    expect(cleanup).not.toContain("createObjectStore");
  });
});

describe("vault client state cleanup", () => {
  it("clearVaultClientState clears session key and purges IndexedDB", async () => {
    const vault = readFileSync(join(process.cwd(), "src/lib/crypto-client/vault.ts"), "utf-8");
    expect(vault).toContain("clearVaultClientState");
    expect(vault).toContain("purgeTrustedDeviceIdb");
    expect(vault).toContain("setSessionVaultKey(null)");
  });
});

describe("CSP headers", () => {
  it("applies nonce-based Content-Security-Policy in production via proxy", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/register"));
    const policy = response.headers.get("Content-Security-Policy");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toMatch(/'nonce-[^']+'/);
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).toContain("'wasm-unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("keeps other security headers in next.config", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf-8");
    expect(config).toContain("X-Content-Type-Options");
    expect(config).not.toContain("Content-Security-Policy");
  });
});
