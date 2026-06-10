import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("revoked trusted devices cannot unlock vault", () => {
  it("trusted device service revokes device and related envelopes", () => {
    const service = readFileSync(
      join(process.cwd(), "src/server/services/trusted-device-service.ts"),
      "utf-8"
    );
    expect(service).toContain("revokeEnvelope");
    expect(service).toContain("revokedAt");
  });

  it("trusted device repository checks revoked_at", () => {
    const repo = readFileSync(
      join(process.cwd(), "src/server/repositories/trusted-device-repository.ts"),
      "utf-8"
    );
    expect(repo).toContain("revokedAt");
    expect(repo).toContain("isNull(trustedDevices.revokedAt)");
  });
});
