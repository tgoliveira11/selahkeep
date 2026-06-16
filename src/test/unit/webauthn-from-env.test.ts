import { describe, expect, it, afterEach } from "vitest";
import {
  resolveWebAuthnOrigins,
  resolveWebAuthnSettings,
  webAuthnRpIdMismatchesAppOrigin,
} from "@/lib/env/webauthn-from-env";

describe("resolveWebAuthnSettings", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("derives RP ID from APP_BASE_URL hostname when WEBAUTHN_RP_ID is unset", () => {
    const settings = resolveWebAuthnSettings({
      APP_BASE_URL: "https://ltg.tgoliveira11.tech",
    });
    expect(settings.rpId).toBe("ltg.tgoliveira11.tech");
    expect(settings.origin).toBe("https://ltg.tgoliveira11.tech");
  });

  it("prefers explicit WEBAUTHN_ORIGIN over APP_BASE_URL", () => {
    const settings = resolveWebAuthnSettings({
      APP_BASE_URL: "https://letter-to-god.vercel.app",
      WEBAUTHN_ORIGIN: "https://ltg.tgoliveira11.tech",
      WEBAUTHN_RP_ID: "ltg.tgoliveira11.tech",
    });
    expect(settings.origin).toBe("https://ltg.tgoliveira11.tech");
    expect(settings.rpId).toBe("ltg.tgoliveira11.tech");
  });

  it("includes APP_BASE_URL in allowed origins", () => {
    const origins = resolveWebAuthnOrigins({
      APP_BASE_URL: "https://letter-to-god.vercel.app",
      WEBAUTHN_ORIGIN: "https://ltg.tgoliveira11.tech",
    });
    expect(origins).toContain("https://letter-to-god.vercel.app");
    expect(origins).toContain("https://ltg.tgoliveira11.tech");
  });

  it("detects explicit RP ID mismatch with app origin", () => {
    expect(
      webAuthnRpIdMismatchesAppOrigin({
        APP_BASE_URL: "https://ltg.tgoliveira11.tech",
        WEBAUTHN_RP_ID: "letter-to-god.vercel.app",
      })
    ).toBe(true);
  });

  it("allows parent RP ID for subdomains", () => {
    expect(
      webAuthnRpIdMismatchesAppOrigin({
        APP_BASE_URL: "https://www.example.com",
        WEBAUTHN_RP_ID: "example.com",
      })
    ).toBe(false);
  });
});
