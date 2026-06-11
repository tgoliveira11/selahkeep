import { describe, it, expect } from "vitest";
import { readModuleSource } from "@/test/helpers/module-source";

const SENTINEL = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";

describe("account sessions security boundaries", () => {
  it("does not expose raw session tokens in API route responses", () => {
    const source = readModuleSource("src/server/services/account-session-service.ts");
    expect(source).not.toMatch(/sessionToken/i);
    expect(source).toContain("ipMasked");
  });

  it("does not include private letter fields in session service", () => {
    const source = readModuleSource("src/server/services/account-session-service.ts");
    expect(source).not.toContain(SENTINEL);
    expect(source).not.toMatch(/vaultKey|encryptedTitle|encryptedBody/i);
  });

  it("does not revoke trusted devices from session management", () => {
    const source = readModuleSource("src/server/services/account-session-service.ts");
    expect(source).not.toMatch(/trustedDevice|vaultEnvelope|trusted_devices/i);
  });
});
