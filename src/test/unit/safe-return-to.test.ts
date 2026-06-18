import { describe, it, expect } from "vitest";
import {
  buildVaultUnlockHref,
  safeNotesReturnTo,
  sanitizeVaultReturnTo,
} from "@/lib/notes/safe-return-to";

describe("sanitizeVaultReturnTo", () => {
  it("allows notes list and detail paths", () => {
    expect(sanitizeVaultReturnTo("/notes")).toBe("/notes");
    expect(sanitizeVaultReturnTo("/notes/abc-123")).toBe("/notes/abc-123");
  });

  it("allows protected vault and account settings paths", () => {
    expect(sanitizeVaultReturnTo("/vault/settings")).toBe("/vault/settings");
    expect(sanitizeVaultReturnTo("/vault/recovery")).toBe("/vault/recovery");
    expect(sanitizeVaultReturnTo("/settings/account")).toBe("/settings/account");
  });

  it("rejects external and unsafe paths", () => {
    expect(sanitizeVaultReturnTo("https://evil.test/notes")).toBeNull();
    expect(sanitizeVaultReturnTo("/vault/unlock")).toBeNull();
    expect(sanitizeVaultReturnTo("//evil.test/notes")).toBeNull();
    expect(sanitizeVaultReturnTo("javascript:alert(1)")).toBeNull();
    expect(sanitizeVaultReturnTo(null)).toBeNull();
  });

  it("safeNotesReturnTo delegates to sanitizeVaultReturnTo", () => {
    expect(safeNotesReturnTo("/vault/settings")).toBe("/vault/settings");
  });
});

describe("buildVaultUnlockHref", () => {
  it("includes returnTo for safe notes paths", () => {
    expect(buildVaultUnlockHref("/notes/note-1")).toBe(
      "/vault/unlock?returnTo=%2Fnotes%2Fnote-1"
    );
  });

  it("includes returnTo for vault settings", () => {
    expect(buildVaultUnlockHref("/vault/settings")).toBe(
      "/vault/unlock?returnTo=%2Fvault%2Fsettings"
    );
  });

  it("omits returnTo when path is unsafe", () => {
    expect(buildVaultUnlockHref("https://evil.test")).toBe("/vault/unlock");
  });
});
