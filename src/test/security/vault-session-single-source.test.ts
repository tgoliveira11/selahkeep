import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import {
  wrapVaultKeyForPassword,
  unwrapVaultKeyFromPassword,
} from "@/lib/crypto-client/vault-envelope";
import {
  getVaultSessionSnapshot,
  hasUnlockedVaultSession,
  lockVaultSessionManually,
  resetVaultSessionStoreForTests,
  setSessionVaultKey,
  subscribeVaultSession,
} from "@/lib/crypto-client/vault-session";
import { exportAesKey } from "@/lib/crypto-client/aes-gcm";

const APPROVED_VAULT_CORE_BROWSER_IMPORTS = new Set([
  "src/lib/crypto-client/vault-passkey-browser.ts",
]);

const DISALLOWED_VAULT_CORE_BROWSER_SCAN_ROOTS = [
  "src/features",
  "src/components",
  "src/app",
  "src/modules",
  "src/server",
];

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

const USER_ID = "00000000-0000-4000-8000-000000000001";

describe("vault session single source of truth", () => {
  it("password unlock after manual lock updates the same session controller", async () => {
    resetVaultSessionStoreForTests();
    setSessionVaultKey(null);
    lockVaultSessionManually();
    expect(hasUnlockedVaultSession()).toBe(false);

    const vaultKey = await generateUserVaultKey();
    const password = "correct-horse-battery-staple-vault";
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForPassword(vaultKey, password, {
      userId: USER_ID,
      resourceId: USER_ID,
    });

    const unwrapped = await unwrapVaultKeyFromPassword(password, encryptedVaultKey, kdfMetadata, {
      applySession: true,
      unlockMethod: "password",
    });

    const a = new Uint8Array(await exportAesKey(vaultKey));
    const b = new Uint8Array(await exportAesKey(unwrapped));
    expect(a).toEqual(b);
    expect(hasUnlockedVaultSession()).toBe(true);
    expect(getVaultSessionSnapshot().status).toBe("unlocked");
    expect(getVaultSessionSnapshot().unlockMethod).toBe("password");
  });

  it("notifies subscribers when password unlock clears manual lock", async () => {
    resetVaultSessionStoreForTests();
    setSessionVaultKey(null);
    lockVaultSessionManually();

    const vaultKey = await generateUserVaultKey();
    const password = "another-strong-vault-password";
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForPassword(vaultKey, password, {
      userId: USER_ID,
      resourceId: USER_ID,
    });

    const snapshots: string[] = [];
    const unsubscribe = subscribeVaultSession((state) => {
      snapshots.push(state.status);
    });

    await unwrapVaultKeyFromPassword(password, encryptedVaultKey, kdfMetadata, {
      applySession: true,
      unlockMethod: "password",
    });

    unsubscribe();
    expect(snapshots).toContain("unlocked");
    expect(hasUnlockedVaultSession()).toBe(true);
  });

  it("applySession false does not clear manual lock or set unlocked session", async () => {
    resetVaultSessionStoreForTests();
    setSessionVaultKey(null);
    lockVaultSessionManually();

    const vaultKey = await generateUserVaultKey();
    const password = "session-not-applied-password";
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForPassword(vaultKey, password, {
      userId: USER_ID,
      resourceId: USER_ID,
    });

    await unwrapVaultKeyFromPassword(password, encryptedVaultKey, kdfMetadata, {
      applySession: false,
    });

    expect(hasUnlockedVaultSession()).toBe(false);
    expect(getVaultSessionSnapshot().status).toBe("locked");
  });

  it("blocks @tgoliveira/vault-core/browser imports outside approved adapters", () => {
    const repoRoot = process.cwd();
    const violations: string[] = [];

    for (const root of DISALLOWED_VAULT_CORE_BROWSER_SCAN_ROOTS) {
      const absoluteRoot = path.join(repoRoot, root);
      for (const file of listSourceFiles(absoluteRoot)) {
        const relative = path.relative(repoRoot, file).split(path.sep).join("/");
        const content = readFileSync(file, "utf8");
        if (content.includes("@tgoliveira/vault-core/browser")) {
          violations.push(relative);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("allows @tgoliveira/vault-core/browser only in approved adapter files", () => {
    const repoRoot = process.cwd();
    const allSrcFiles = listSourceFiles(path.join(repoRoot, "src")).filter(
      (file) => !file.includes(`${path.sep}test${path.sep}`)
    );
    const importers = allSrcFiles
      .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"))
      .filter((relative) => {
        const content = readFileSync(path.join(repoRoot, relative), "utf8");
        return content.includes("@tgoliveira/vault-core/browser");
      });

    for (const relative of importers) {
      expect(APPROVED_VAULT_CORE_BROWSER_IMPORTS.has(relative)).toBe(true);
    }
    expect(importers).toContain("src/lib/crypto-client/vault-passkey-browser.ts");
  });

  it("keeps in-memory UVK in src/lib/crypto-client/vault-session.ts", () => {
    const sessionModule = readFileSync(
      path.join(process.cwd(), "src/lib/crypto-client/vault-session.ts"),
      "utf8"
    );
    expect(sessionModule).toContain("__selahkeepVaultSessionStore");
    expect(sessionModule).toContain("setUnlockedVaultSession");
    expect(sessionModule).not.toContain("@tgoliveira/vault-core/browser");
  });
});
