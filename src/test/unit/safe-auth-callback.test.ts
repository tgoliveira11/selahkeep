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
  });

  it("defaults to /notes when path is missing or invalid", () => {
    expect(sanitizeAuthCallbackUrl(null)).toBe("/notes");
    expect(sanitizeAuthCallbackUrl(undefined)).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("")).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("https://evil.test/notes")).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("//evil.test/notes")).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("javascript:alert(1)")).toBe("/notes");
  });

  it("rejects auth loop paths and defaults to /notes", () => {
    expect(sanitizeAuthCallbackUrl("/login")).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("/login/2fa")).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("/login/complete")).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("/auth/two-factor")).toBe("/notes");
  });

  it("rejects vault unlock paths", () => {
    expect(sanitizeAuthCallbackUrl("/vault/unlock")).toBe("/notes");
    expect(sanitizeAuthCallbackUrl("/vault/unlock?returnTo=%2Fnotes")).toBe("/notes");
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
