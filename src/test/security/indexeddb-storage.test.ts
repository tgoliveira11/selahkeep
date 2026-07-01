import { lockVaultSession } from "@/lib/crypto-client/vault-session";
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
    expect(cleanup).toMatch(/DB_VERSION = 4/);
    expect(cleanup).toContain("deleteObjectStore");
    expect(cleanup).toContain("encrypted_note_drafts");
  });

  it("creates encrypted_note_drafts store on upgrade", () => {
    expect(cleanup).toContain("encrypted_note_drafts");
  });

  it("note drafts use encrypted note_draft AAD field", () => {
    const drafts = readFileSync(
      join(process.cwd(), "src/lib/crypto-client/note-drafts.ts"),
      "utf-8"
    );
    expect(drafts).toContain('field: "note_draft"');
    expect(drafts).toContain("encryptField");
    expect(drafts).not.toContain("localStorage");
    expect(drafts).not.toContain("sessionStorage");
  });
});

describe("vault client state cleanup", () => {
  it("clearVaultClientState clears session key and purges IndexedDB", async () => {
    const vault = readFileSync(join(process.cwd(), "src/lib/crypto-client/vault.ts"), "utf-8");
    expect(vault).toContain("clearVaultClientState");
    expect(vault).toContain("purgeTrustedDeviceIdb");
    expect(vault).toContain('lockVaultSession("logout")');
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
