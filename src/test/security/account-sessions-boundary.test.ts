import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SENTINEL = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";

describe("account sessions security boundaries", () => {
  it("does not expose raw session tokens in API route responses", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/services/account-session-service.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/sessionToken/i);
    expect(source).toContain("ipMasked");
  });

  it("does not include private letter fields in session service", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/services/account-session-service.ts"),
      "utf8"
    );
    expect(source).not.toContain(SENTINEL);
    expect(source).not.toMatch(/vaultKey|encryptedTitle|encryptedBody/i);
  });

  it("does not revoke trusted devices from session management", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/services/account-session-service.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/trustedDevice|vaultEnvelope|trusted_devices/i);
  });
});
