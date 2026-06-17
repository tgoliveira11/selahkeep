import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function listFilesRecursive(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFilesRecursive(full, acc);
    } else if (entry.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

const forbiddenPaths = [
  "src/app/api/trusted-devices",
  "src/app/api/vault/device-envelopes",
  "src/app/(vault)/vault/devices",
  "src/modules/vault/repositories/trusted-device-repository.ts",
  "src/modules/vault/services/trusted-device-service.ts",
  "src/server/repositories/trusted-device-repository.ts",
  "src/server/services/trusted-device-service.ts",
  "src/lib/validation/trusted-devices.ts",
  "src/lib/api-client/trusted-devices.ts",
  "src/lib/trusted-device-utils.ts",
  "src/modules/vault/lib/trusted-device-utils.ts",
  "src/lib/device-display-info.ts",
  "src/lib/crypto-client/device-storage.ts",
  "src/lib/crypto-client/vault-unlock.ts",
  "src/lib/crypto-client/trusted-device-unlock-errors.ts",
  "src/lib/crypto-client/trusted-device-unlock-verification.ts",
  "src/lib/crypto-client/record-device-unlock.ts",
];

const forbiddenPatterns = [
  /trusted_devices/,
  /trustedDeviceRepository/,
  /trustedDeviceService/,
  /unwrapVaultKeyFromDevice/,
  /buildDeviceVaultEnvelope/,
  /persistUnlockedVaultOnDevice/,
  /recordTrustedDeviceUnlock/,
  /\/api\/trusted-devices/,
  /\/api\/vault\/device-envelopes/,
  /method:\s*["']trusted_device["']/,
];

describe("no trusted devices guard", () => {
  it("does not keep trusted-device module files or routes", () => {
    for (const relativePath of forbiddenPaths) {
      expect(existsSync(path.join(root, relativePath))).toBe(false);
    }
  });

  it("does not define trusted_devices in active schema", () => {
    const schema = readSource("src/lib/db/app-schema.ts");
    expect(schema).not.toContain("trustedDevices");
    expect(schema).not.toContain('"trusted_devices"');
  });

  it("does not reference trusted-device unlock in active src", () => {
    const srcRoot = path.join(root, "src");
    const files = listFilesRecursive(srcRoot).filter(
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx")) &&
        !f.includes(`${path.sep}test${path.sep}`) &&
        !f.includes("TRUSTED_DEVICES")
    );

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const pattern of forbiddenPatterns) {
        expect(content, `${path.relative(root, file)} must not match ${pattern}`).not.toMatch(
          pattern
        );
      }
    }
  });

  it("purges legacy trusted-device IndexedDB stores on upgrade", () => {
    const cleanup = readSource("src/lib/crypto-client/vault-idb-cleanup.ts");
    expect(cleanup).toContain("device_secrets");
    expect(cleanup).toContain("vault_envelopes");
    expect(cleanup).toContain("DB_VERSION = 3");
  });
});
