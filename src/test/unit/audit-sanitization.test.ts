import { describe, it, expect } from "vitest";
import {
  sanitizeAuditMetadata,
  containsSensitiveText,
} from "@/server/policies/audit-sanitization";
import { SENTINEL_PHRASE } from "@/test/security/sentinel-phrase.test";

describe("audit sanitization", () => {
  it("allows safe metadata keys only", () => {
    expect(
      sanitizeAuditMetadata({
        deviceId: "device-1",
        method: "passkey",
        endpoint: "/api/passkeys/authenticate",
        title: SENTINEL_PHRASE,
        recoveryCode: "secret",
      })
    ).toEqual({
      deviceId: "device-1",
      method: "passkey",
      endpoint: "/api/passkeys/authenticate",
    });
  });

  it("drops metadata values containing sentinel phrase", () => {
    expect(
      sanitizeAuditMetadata({
        endpoint: `failed at ${SENTINEL_PHRASE}`,
      })
    ).toBeNull();
  });

  it("detects sensitive text patterns", () => {
    expect(containsSensitiveText(SENTINEL_PHRASE)).toBe(true);
    expect(containsSensitiveText("recovery-code-value")).toBe(true);
    expect(containsSensitiveText("/api/letters")).toBe(false);
  });
});
