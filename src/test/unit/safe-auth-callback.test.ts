import { describe, it, expect } from "vitest";
import { sanitizeAuthCallbackUrl } from "@/lib/auth/safe-auth-callback";

describe("sanitizeAuthCallbackUrl", () => {
  it("allows safe internal workspace paths", () => {
    expect(sanitizeAuthCallbackUrl("/notes")).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("/notes/abc-123")).toBe("/notes/abc-123");
    expect(sanitizeAuthCallbackUrl("/vault/settings")).toBe("/vault/settings");
    expect(sanitizeAuthCallbackUrl("/vault/security")).toBe("/vault/security");
    expect(sanitizeAuthCallbackUrl("/vault/recovery")).toBe("/vault/recovery");
    expect(sanitizeAuthCallbackUrl("/settings/account")).toBe("/settings/account");
    expect(sanitizeAuthCallbackUrl("/admin")).toBe("/admin");
    expect(sanitizeAuthCallbackUrl("/admin/users")).toBe("/admin/users");
  });

  it("defaults to /home when path is missing or invalid", () => {
    expect(sanitizeAuthCallbackUrl(null)).toBe("/home");
    expect(sanitizeAuthCallbackUrl(undefined)).toBe("/home");
    expect(sanitizeAuthCallbackUrl("")).toBe("/home");
    expect(sanitizeAuthCallbackUrl("https://evil.test/notes")).toBe("/home");
    expect(sanitizeAuthCallbackUrl("//evil.test/notes")).toBe("/home");
    expect(sanitizeAuthCallbackUrl("javascript:alert(1)")).toBe("/home");
  });

  it("allows /home and /notes as safe callback paths", () => {
    expect(sanitizeAuthCallbackUrl("/home")).toBe("/home");
    expect(sanitizeAuthCallbackUrl("/notes")).toBe("/notes");
  });

  it("rejects auth loop paths and defaults to /home", () => {
    expect(sanitizeAuthCallbackUrl("/login")).toBe("/home");
    expect(sanitizeAuthCallbackUrl("/login/2fa")).toBe("/home");
    expect(sanitizeAuthCallbackUrl("/login/complete")).toBe("/home");
    expect(sanitizeAuthCallbackUrl("/auth/two-factor")).toBe("/home");
  });

  it("rejects vault unlock paths", () => {
    expect(sanitizeAuthCallbackUrl("/vault/unlock")).toBe("/home");
    expect(sanitizeAuthCallbackUrl("/vault/unlock?returnTo=%2Fnotes")).toBe("/home");
  });

  it("preserves query string for safe paths", () => {
    expect(sanitizeAuthCallbackUrl("/vault/settings?tab=security")).toBe(
      "/vault/settings?tab=security"
    );
  });

  it("respects a custom default path", () => {
    expect(sanitizeAuthCallbackUrl(null, "/vault/settings")).toBe("/vault/settings");
    expect(sanitizeAuthCallbackUrl("/login", "/vault/settings")).toBe("/vault/settings");
  });
});
