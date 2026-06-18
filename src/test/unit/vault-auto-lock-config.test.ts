import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_VAULT_AUTO_LOCK_MINUTES,
  getVaultAutoLockTimeoutMs,
  VAULT_INACTIVITY_MS,
} from "@/lib/vault/vault-auto-lock-config";

describe("vault auto-lock config", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.resetModules();
  });

  it("defaults to 15 minutes", () => {
    delete process.env.NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES;
    delete process.env.VAULT_AUTO_LOCK_MINUTES;
    expect(getVaultAutoLockTimeoutMs()).toBe(15 * 60 * 1000);
    expect(DEFAULT_VAULT_AUTO_LOCK_MINUTES).toBe(15);
  });

  it("reads NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES when set", async () => {
    process.env.NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES = "30";
    vi.resetModules();
    const mod = await import("@/lib/vault/vault-auto-lock-config");
    expect(mod.getVaultAutoLockTimeoutMs()).toBe(30 * 60 * 1000);
  });

  it("reads VAULT_AUTO_LOCK_MINUTES when public var is absent", async () => {
    delete process.env.NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES;
    process.env.VAULT_AUTO_LOCK_MINUTES = "20";
    vi.resetModules();
    const mod = await import("@/lib/vault/vault-auto-lock-config");
    expect(mod.getVaultAutoLockTimeoutMs()).toBe(20 * 60 * 1000);
  });

  it("prefers NEXT_PUBLIC over server-only env", async () => {
    process.env.NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES = "25";
    process.env.VAULT_AUTO_LOCK_MINUTES = "10";
    vi.resetModules();
    const mod = await import("@/lib/vault/vault-auto-lock-config");
    expect(mod.getVaultAutoLockTimeoutMs()).toBe(25 * 60 * 1000);
  });

  it("falls back on invalid values", async () => {
    process.env.NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES = "0";
    vi.resetModules();
    const mod = await import("@/lib/vault/vault-auto-lock-config");
    expect(mod.getVaultAutoLockTimeoutMs()).toBe(DEFAULT_VAULT_AUTO_LOCK_MINUTES * 60 * 1000);
  });

  it("falls back on non-numeric values", async () => {
    process.env.NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES = "abc";
    vi.resetModules();
    const mod = await import("@/lib/vault/vault-auto-lock-config");
    expect(mod.getVaultAutoLockTimeoutMs()).toBe(DEFAULT_VAULT_AUTO_LOCK_MINUTES * 60 * 1000);
  });

  it("exports module-load constant aligned with default", () => {
    expect(VAULT_INACTIVITY_MS).toBe(DEFAULT_VAULT_AUTO_LOCK_MINUTES * 60 * 1000);
  });
});
