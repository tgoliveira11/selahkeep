import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { readModuleSource } from "@/test/helpers/module-source";

describe("revoked trusted devices cannot unlock vault", () => {
  it("trusted device service revokes device and related envelopes", () => {
    const service = readModuleSource("src/server/services/trusted-device-service.ts");
    expect(service).toContain("revokeEnvelope");
    expect(service).toContain("revokedAt");
  });

  it("trusted device repository checks revoked_at", () => {
    const repo = readModuleSource("src/server/repositories/trusted-device-repository.ts");
    expect(repo).toContain("revokedAt");
    expect(repo).toContain("isNull(trustedDevices.revokedAt)");
  });
});
